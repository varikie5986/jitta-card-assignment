const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DATABASE_USER || "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  database: process.env.DATABASE_NAME || "postgres",
  password: process.env.DATABASE_PASSWORD || "admin1234",
  port: process.env.DATABASE_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = { pool };
