const walletService = require("../service/wallet");
const { successStatus } = require("../common/status");

const getWalletBalances = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { walletType } = req.query;

    if (!walletType) {
      res.status(400);
      return next(new Error("Wallet type is required"));
    }

    const balances = await walletService.getWalletBalances(userId, walletType);

    if (balances.length > 0) {
      return res.status(200).json({
        status: successStatus,
        data: balances,
      });
    } else {
      // * Need to clarify for proper http status
      res.status(404);
      return next(new Error("No wallet found for the user"));
    }
  } catch (error) {
    console.error("Error fetching wallet balances:", error);
    res.status(500);
    next(error);
  }
};

const depositMoney = async (req, res, next) => {
  try {
    const { amount, userId } = req.body;
    const prepAmount = prepFloatNumberToBeTwoDigits(amount);

    if (prepAmount <= 0) {
      res.status(400);
      return next(new Error("Deposit amount must be greater than zero"));
    }

    const updatedWallet = await walletService.deposit(userId, prepAmount);

    if (updatedWallet) {
      return res.status(200).json({
        status: successStatus,
        data: updatedWallet,
      });
    } else {
      // * Need to clarify for proper http status
      res.status(404);
      return next(new Error("MAIN wallet not found for the user"));
    }
  } catch (error) {
    console.error("Error depositing money:", error);
    res.status(500);
    next(error);
  }
};

const withdrawMoney = async (req, res, next) => {
  try {
    const { amount, userId } = req.body;
    const prepAmount = prepFloatNumberToBeTwoDigits(amount);

    if (prepAmount <= 0) {
      res.status(400);
      return next(new Error("Withdrawal amount must be greater than zero"));
    }

    const updatedWallet = await walletService.withdraw(userId, prepAmount);

    if (updatedWallet) {
      return res.status(200).json({
        status: successStatus,
        data: updatedWallet,
      });
    } else {
      // * Need to clarify for proper http status
      res.status(404);
      return next(
        new Error("MAIN wallet not found for the user or insufficient funds")
      );
    }
  } catch (error) {
    console.error("Error withdrawing money:", error);
    res.status(500);
    next(error);
  }
};

const pay = async (req, res, next) => {
  try {
    const { amount, userId } = req.body;
    const prepAmount = prepFloatNumberToBeTwoDigits(amount);

    if (!prepAmount || prepAmount <= 0) {
      res.status(400);
      return next(new Error("Invalid amount"));
    }

    const result = await walletService.pay(userId, prepAmount);

    return res.status(200).json({
      status: successStatus,
      data: result.data,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500);
    next(error);
  }
};

const transfer = async (req, res, next) => {
  const { senderUserId, recipientUserId, amount } = req.body;
  const prepAmount = prepFloatNumberToBeTwoDigits(amount);

  try {
    if (!senderUserId || !recipientUserId || !prepAmount) {
      res.status(400);
      return next(new Error("Missing required fields"));
    }

    const result = await walletService.transfer(
      senderUserId,
      recipientUserId,
      prepAmount
    );

    return res.status(200).json({
      status: successStatus,
      data: result.data,
    });
  } catch (error) {
    console.error("Error during transfer:", error);
    res.status(500);
    next(error);
  }
};

const loan = async (req, res, next) => {
  const { userId, requestedAmount } = req.body;
  const prepRequestedAmount = prepFloatNumberToBeTwoDigits(requestedAmount);

  try {
    if (!userId || !prepRequestedAmount) {
      res.status(400);
      return next(new Error("User ID and requested loan amount are required"));
    }

    const result = await walletService.loan(userId, prepRequestedAmount);

    return res.status(200).json({
      status: successStatus,
      data: result.data,
    });
  } catch (error) {
    console.error("Error during loan process:", error);
    res.status(500);
    next(error);
  }
};

const settle = async (req, res, next) => {
  const { userId, amount } = req.body;
  const prepAmount = prepFloatNumberToBeTwoDigits(amount);

  try {
    if (!userId || !prepAmount) {
      res.status(400);
      return next(new Error("User ID and amount are required"));
    }

    const result = await walletService.settle(userId, prepAmount);

    return res.status(200).json({
      status: successStatus,
      data: result.data,
    });
  } catch (error) {
    console.error("Error during settle process:", error);
    res.status(500);
    next(error);
  }
};

const prepFloatNumberToBeTwoDigits = (amount) => {
  return parseFloat(amount).toFixed(2);
};

module.exports = {
  getWalletBalances,
  depositMoney,
  withdrawMoney,
  pay,
  transfer,
  loan,
  settle,
};
