const express = require("express");
const transactionController = require("../controller/transaction");

const transactionRouter = express.Router();

// Get transactions for a user
transactionRouter.get("/:userId", (req, res, next) => {
  return transactionController.getTransactions(req, res, next);
});

module.exports = { transactionRouter };
