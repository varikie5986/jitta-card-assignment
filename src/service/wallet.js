const { pool } = require("../config/databaseConfig");
const Decimal = require("decimal.js");

const getWalletBalances = async (userId, walletType) => {
  try {
    let query;
    let variables;

    if (walletType === "ALL") {
      query = `
        SELECT wallet_name, balance
        FROM jitta_card.wallets
        WHERE user_id = $1`;
      variables = [userId];
    } else {
      query = `
        SELECT wallet_name, balance
        FROM jitta_card.wallets
        WHERE user_id = $1 AND wallet_name = $2`;
      variables = [userId, walletType];
    }

    const result = await pool.query(query, variables);
    return result.rows;
  } catch (err) {
    console.error("Error fetching wallet balances:", err);
    throw err;
  }
};

const deposit = async (userId, amount) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const query = `UPDATE jitta_card.wallets SET balance = balance + $1 WHERE user_id = $2 AND wallet_name = 'MAIN' RETURNING *`;
    const variables = [amount, userId];
    const walletResult = await client.query(query, variables);
    const updatedWallet = walletResult.rows[0];
    const walletId = updatedWallet.id;

    await createTransaction(
      client,
      null,
      walletId,
      amount,
      "deposit",
      "completed",
      "Deposit into MAIN wallet"
    );

    await client.query("COMMIT");
    return updatedWallet;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error depositing money:", err);
    throw err;
  } finally {
    client.release();
  }
};

const withdraw = async (userId, amount) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch the current balance from the MAIN wallet
    const balanceQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'MAIN'
    `;
    const balanceResult = await client.query(balanceQuery, [userId]);
    const currentWallet = balanceResult.rows[0];

    if (!currentWallet) {
      throw new Error("MAIN wallet not found");
    }

    // Check if there are sufficient funds in the MAIN wallet
    const currentBalance = new Decimal(currentWallet.balance);
    if (currentBalance.lessThan(amount)) {
      throw new Error("Insufficient funds in MAIN wallet");
    }

    // Calculate the new balance after withdrawal using Decimal.js
    const newBalance = currentBalance.minus(amount);

    // Update the MAIN wallet balance
    const updateQuery = `
      UPDATE jitta_card.wallets 
      SET balance = $1 
      WHERE user_id = $2 AND wallet_name = 'MAIN' 
      RETURNING *
    `;
    const walletResult = await client.query(updateQuery, [
      newBalance.toFixed(2),
      userId,
    ]);
    const updatedWallet = walletResult.rows[0];

    await createTransaction(
      client,
      updatedWallet.id, // from_wallet_id
      null, // to_wallet_id (null for withdrawal)
      amount,
      "withdraw",
      "completed",
      "Withdrawal from MAIN wallet"
    );

    await client.query("COMMIT");

    return updatedWallet;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error withdrawing money:", err);
    throw err;
  } finally {
    client.release();
  }
};

const pay = async (userId, amount) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch user data to check round-up preference
    const userQuery = `SELECT is_round_up FROM jitta_card.users WHERE id = $1`;
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }

    const { is_round_up } = userResult.rows[0];

    // Fetch MAIN and EARN wallet data
    const mainWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'MAIN'
    `;
    const earnWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'EARN'
    `;

    const mainWalletResult = await client.query(mainWalletQuery, [userId]);
    const earnWalletResult = await client.query(earnWalletQuery, [userId]);

    if (
      mainWalletResult.rows.length === 0 ||
      earnWalletResult.rows.length === 0
    ) {
      throw new Error("Wallet not found");
    }

    const mainWallet = mainWalletResult.rows[0];
    const earnWallet = earnWalletResult.rows[0];

    // Check if there are sufficient funds in the MAIN wallet
    const mainWalletBalance = new Decimal(mainWallet.balance);
    if (mainWalletBalance.lessThan(amount)) {
      throw new Error("Insufficient balance in MAIN wallet");
    }

    let roundUpAmount = new Decimal(0);
    let updatedMainBalance = mainWalletBalance.minus(amount);
    let updatedEarnBalance = new Decimal(earnWallet.balance);

    if (is_round_up) {
      roundUpAmount = new Decimal(roundUp(updatedMainBalance));
      updatedMainBalance = updatedMainBalance.minus(roundUpAmount);
      updatedEarnBalance = updatedEarnBalance.plus(roundUpAmount);

      // Update MAIN wallet
      const updateMainWalletQuery = `
        UPDATE jitta_card.wallets 
        SET balance = $1 
        WHERE id = $2
      `;
      await client.query(updateMainWalletQuery, [
        updatedMainBalance.toFixed(2),
        mainWallet.id,
      ]);

      if (!roundUpAmount.isZero()) {
        // Update EARN wallet
        const updateEarnWalletQuery = `
          UPDATE jitta_card.wallets 
          SET balance = $1 
          WHERE id = $2
        `;
        await client.query(updateEarnWalletQuery, [
          updatedEarnBalance.toFixed(2),
          earnWallet.id,
        ]);

        // Record the round-up transaction
        await createTransaction(
          client,
          mainWallet.id,
          earnWallet.id,
          roundUpAmount.toFixed(2),
          "round_up",
          "completed",
          "Round-up from payment"
        );
      }
    } else {
      // Update MAIN wallet balance without rounding up
      const updateMainWalletQuery = `
        UPDATE jitta_card.wallets 
        SET balance = $1 
        WHERE id = $2
      `;
      await client.query(updateMainWalletQuery, [
        updatedMainBalance.toFixed(2),
        mainWallet.id,
      ]);
    }

    // Log the payment transaction
    await createTransaction(
      client,
      mainWallet.id,
      null,
      amount,
      "payment",
      "completed",
      "Payment for external services"
    );

    await client.query("COMMIT");

    return {
      data: {
        updatedMainBalance: updatedMainBalance.toFixed(2),
        updatedEarnBalance: updatedEarnBalance.toFixed(2),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error executing pay query:", err);
    throw err;
  } finally {
    client.release();
  }
};

const transfer = async (senderUserId, recipientUserId, amount) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check if sender has sufficient balance in MAIN wallet
    const senderWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'MAIN'
    `;
    const senderWalletResult = await client.query(senderWalletQuery, [
      senderUserId,
    ]);
    const senderWallet = senderWalletResult.rows[0];

    if (!senderWallet) {
      throw new Error("Sender's wallet not found");
    }

    const senderBalance = new Decimal(senderWallet.balance);
    const transferAmount = new Decimal(amount);

    if (senderBalance.lessThan(transferAmount)) {
      throw new Error("Insufficient money in sender's MAIN wallet");
    }

    // Get recipient's MAIN wallet
    const recipientWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'MAIN'
    `;
    const recipientWalletResult = await client.query(recipientWalletQuery, [
      recipientUserId,
    ]);
    const recipientWallet = recipientWalletResult.rows[0];

    if (!recipientWallet) {
      throw new Error("Recipient's wallet not found");
    }

    // Update sender's wallet
    const updatedSenderBalance = senderBalance.minus(transferAmount);
    const updateSenderWalletQuery = `
      UPDATE jitta_card.wallets 
      SET balance = $1 
      WHERE id = $2
    `;
    await client.query(updateSenderWalletQuery, [
      updatedSenderBalance.toFixed(),
      senderWallet.id,
    ]);

    // Update recipient's wallet
    const recipientBalance = new Decimal(recipientWallet.balance);
    const updatedRecipientBalance = recipientBalance.plus(transferAmount);
    const updateRecipientWalletQuery = `
      UPDATE jitta_card.wallets 
      SET balance = $1 
      WHERE id = $2
    `;
    await client.query(updateRecipientWalletQuery, [
      updatedRecipientBalance.toFixed(),
      recipientWallet.id,
    ]);

    await createTransaction(
      client,
      senderWallet.id,
      recipientWallet.id,
      amount,
      "transfer",
      "completed",
      "Transfer to other"
    );

    await client.query("COMMIT");

    return {
      data: {
        updatedSenderBalance: updatedSenderBalance.toFixed(),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error executing transfer query:", err);
    throw err;
  } finally {
    client.release();
  }
};

const loan = async (userId, requestedAmount) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch the balance from EARN wallet
    const earnWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'EARN'
    `;
    const earnWalletResult = await client.query(earnWalletQuery, [userId]);
    const earnWallet = earnWalletResult.rows[0];

    if (!earnWallet || new Decimal(earnWallet.balance).lessThanOrEqualTo(0)) {
      throw new Error(
        "Insufficient balance in EARN wallet or wallet not found"
      );
    }

    // Calculate the maximum loanable amount (50% of EARN wallet balance)
    const maxLoanAmount = new Decimal(earnWallet.balance).times(0.5);

    // Fetch existing loan amount from LOAN wallet
    const loanWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'LOAN'
    `;
    const loanWalletResult = await client.query(loanWalletQuery, [userId]);
    const loanWallet = loanWalletResult.rows[0];

    if (!loanWallet) {
      throw new Error("LOAN wallet not found");
    }

    // Calculate the already loaned amount
    const alreadyLoanedAmount = new Decimal(loanWallet.balance).abs();
    const availableLoanAmount = maxLoanAmount.minus(alreadyLoanedAmount);

    // Check if the requested loan amount is within the limit
    if (new Decimal(requestedAmount).greaterThan(availableLoanAmount)) {
      throw new Error(
        `Requested loan amount exceeds the allowable limit. You can only loan up to ${availableLoanAmount.toFixed(
          2
        )} more.`
      );
    }

    // Fetch MAIN wallet
    const mainWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'MAIN'
    `;
    const mainWalletResult = await client.query(mainWalletQuery, [userId]);
    const mainWallet = mainWalletResult.rows[0];

    if (!mainWallet) {
      throw new Error("MAIN wallet not found");
    }

    // Update MAIN wallet balance
    const newMainBalance = new Decimal(mainWallet.balance).plus(
      requestedAmount
    );
    const updateMainWalletQuery = `
      UPDATE jitta_card.wallets 
      SET balance = $1 
      WHERE id = $2
    `;
    await client.query(updateMainWalletQuery, [
      newMainBalance.toFixed(2),
      mainWallet.id,
    ]);

    // Update LOAN wallet balance
    const newLoanBalance = new Decimal(loanWallet.balance).minus(
      requestedAmount
    ); // Increase the loan balance as negative
    const updateLoanWalletQuery = `
      UPDATE jitta_card.wallets 
      SET balance = $1 
      WHERE id = $2
    `;
    await client.query(updateLoanWalletQuery, [
      newLoanBalance.toFixed(2),
      loanWallet.id,
    ]);

    await createTransaction(
      client,
      loanWallet.id,
      mainWallet.id,
      parseFloat(requestedAmount).toFixed(2),
      "loan",
      "completed",
      "Loan to MAIN wallet"
    );

    await client.query("COMMIT");

    return {
      data: {
        newMainBalance: parseFloat(newMainBalance).toFixed(2),
        newLoanBalance: parseFloat(newLoanBalance).toFixed(2),
        loanedAmount: parseFloat(requestedAmount).toFixed(2),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error processing loan:", err);
    throw err;
  } finally {
    client.release();
  }
};

const settle = async (userId, amount) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch the MAIN wallet
    const mainWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'MAIN'
    `;
    const mainWalletResult = await client.query(mainWalletQuery, [userId]);
    const mainWallet = mainWalletResult.rows[0];

    if (!mainWallet || new Decimal(mainWallet.balance).lessThan(amount)) {
      throw new Error(
        "Insufficient balance in MAIN wallet or wallet not found"
      );
    }

    // Fetch the LOAN wallet
    const loanWalletQuery = `
      SELECT id, balance 
      FROM jitta_card.wallets 
      WHERE user_id = $1 AND wallet_name = 'LOAN'
    `;
    const loanWalletResult = await client.query(loanWalletQuery, [userId]);
    const loanWallet = loanWalletResult.rows[0];

    if (!loanWallet) {
      throw new Error("LOAN wallet not found");
    }
    if (new Decimal(Math.abs(loanWallet.balance)).lessThan(amount)) {
      throw new Error("Cannot settle more than debt");
    }

    // Calculate the new balances using Decimal.js
    const newMainBalance = new Decimal(mainWallet.balance).minus(amount);
    const newLoanBalance = new Decimal(loanWallet.balance).plus(amount);

    // Update the MAIN wallet balance
    const updateMainWalletQuery = `
      UPDATE jitta_card.wallets 
      SET balance = $1 
      WHERE id = $2
    `;
    await client.query(updateMainWalletQuery, [
      newMainBalance.toFixed(2),
      mainWallet.id,
    ]);

    // Update the LOAN wallet balance
    const updateLoanWalletQuery = `
      UPDATE jitta_card.wallets 
      SET balance = $1 
      WHERE id = $2
    `;
    await client.query(updateLoanWalletQuery, [
      newLoanBalance.toFixed(2),
      loanWallet.id,
    ]);

    // Create a transaction record for the payment
    await createTransaction(
      client,
      mainWallet.id,
      loanWallet.id,
      amount,
      "settle",
      "completed",
      "Payment towards LOAN wallet"
    );

    await client.query("COMMIT");

    return {
      data: {
        newMainBalance: newMainBalance.toFixed(2),
        newLoanBalance: newLoanBalance.toFixed(2),
        amount: parseFloat(amount).toFixed(2),
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error processing loan payment:", err);
    throw err;
  } finally {
    client.release();
  }
};

const roundUp = (updatedMainBalance) => {
  return updatedMainBalance % 100;
};

const createTransaction = async (
  client,
  fromWalletId,
  toWalletId,
  amount,
  type,
  status,
  remarks
) => {
  const query = `INSERT INTO jitta_card.transactions (from_wallet_id, to_wallet_id, amount, type, status, remarks) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
  const values = [fromWalletId, toWalletId, amount, type, status, remarks];
  const result = await client.query(query, values);
  return result.rows[0];
};

module.exports = {
  getWalletBalances,
  deposit,
  withdraw,
  pay,
  transfer,
  loan,
  settle,
};
