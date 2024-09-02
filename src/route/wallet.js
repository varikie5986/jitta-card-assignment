const express = require("express");
const walletController = require("../controller/wallet");

const walletRouter = express.Router();

// Get wallet balances by user ID and wallet type
walletRouter.get("/balance/:userId", (req, res, next) => {
  return walletController.getWalletBalances(req, res, next);
});

// Deposit money into MAIN wallet
walletRouter.post("/deposit", (req, res, next) => {
  return walletController.depositMoney(req, res, next);
});

// Withdraw money from MAIN wallet
walletRouter.post("/withdraw", (req, res, next) => {
  return walletController.withdrawMoney(req, res, next);
});

// Pay with money from MAIN wallet - Round up
walletRouter.post("/pay", (req, res, next) => {
  return walletController.pay(req, res, next);
});

// Transfer money from MAIN wallet to another one
walletRouter.post("/transfer", (req, res, next) => {
  return walletController.transfer(req, res, next);
});

// Loan money from EARN wallet to MAIN wallet
walletRouter.post("/loan", (req, res, next) => {
  return walletController.loan(req, res, next);
});

// Settle
walletRouter.post("/settle", (req, res, next) => {
  return walletController.settle(req, res, next);
});

module.exports = { walletRouter };
