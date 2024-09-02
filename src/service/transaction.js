const { pool } = require("../config/databaseConfig");

const getTransactions = async (
  userId,
  walletType,
  transactionType,
  startDate,
  endDate
) => {
  const client = await pool.connect();
  try {
    let query = `
      SELECT t.id, t.from_wallet_id, t.to_wallet_id, t.amount, t.type, t.status, t.transaction_date, t.remarks,
             w.wallet_name 
      FROM jitta_card.transactions t
      JOIN jitta_card.wallets w ON t.from_wallet_id = w.id OR t.to_wallet_id = w.id
      WHERE w.user_id = $1
    `;
    const variables = [userId];

    if (walletType && walletType !== "ALL") {
      query += ` AND w.wallet_name = $${variables.length + 1}`;
      variables.push(walletType);
    }

    if (transactionType) {
      query += ` AND t.type = $${variables.length + 1}`;
      variables.push(transactionType);
    }

    if (startDate) {
      query += ` AND t.transaction_date >= $${variables.length + 1}`;
      variables.push(startDate);
    }

    if (endDate) {
      query += ` AND t.transaction_date <= $${variables.length + 1}`;
      variables.push(endDate);
    }

    query += " ORDER BY t.transaction_date DESC";

    const result = await client.query(query, variables);
    return result.rows;
  } catch (err) {
    console.error("Error retrieving transactions:", err);
    throw new Error("Database error");
  } finally {
    client.release();
  }
};

module.exports = { getTransactions };
