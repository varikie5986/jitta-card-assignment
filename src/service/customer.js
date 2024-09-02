const { pool } = require("../config/databaseConfig");

const login = async (userName) => {
  try {
    const results = await inquiryUserByUserName(userName);
    if (results?.rows.length > 0) {
      return { success: true, data: results.rows[0] };
    } else {
      return { success: false };
    }
  } catch (err) {
    console.error("Error executing login query:", err);
    throw new Error("Database error");
  }
};

const register = async (userName) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingUser = await inquiryUserByUserName(userName, client);
    if (existingUser?.rows.length > 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Username already exists" };
    }

    const userInsertQuery = `INSERT INTO jitta_card.users (username, is_round_up) VALUES ($1, $2) RETURNING id`;
    const userValues = [userName, true];
    const userResult = await client.query(userInsertQuery, userValues);
    const userId = userResult.rows[0].id;

    const walletNames = ["MAIN", "EARN", "LOAN"];
    const walletInsertQuery = `INSERT INTO jitta_card.wallets (user_id, wallet_name, balance) VALUES ($1, $2, $3)`;

    for (const walletName of walletNames) {
      const walletValues = [userId, walletName, 0];
      await client.query(walletInsertQuery, walletValues);
    }

    await client.query("COMMIT");
    return { success: true, data: { userId, userName } };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error executing register query:", err);
    throw new Error("Database error");
  } finally {
    client.release();
  }
};

const toggleRoundUp = async (userId, roundUp) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const query = `UPDATE jitta_card.users SET is_round_up = $1 WHERE id = $2 RETURNING *`;
    const values = [roundUp, userId];

    const result = await client.query(query, values);
    await client.query("COMMIT");

    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating is_round_up:", err);
    throw new Error("Database error");
  } finally {
    client.release();
  }
};

const inquiryUserByUserName = async (userName, client = pool) => {
  const query = `SELECT * FROM jitta_card.users WHERE username = $1`;
  const variables = [userName];
  return await client.query(query, variables);
};

module.exports = { login, register, toggleRoundUp };
