const express = require("express");
const customerRouter = express.Router();
const customerController = require("../controller/customer");

// * Login Route
customerRouter.post("/login", (req, res, next) => {
  return customerController.login(req, res, next);
});

// * Register Route
customerRouter.post("/register", (req, res, next) => {
  return customerController.register(req, res, next);
});

// * Toggle is_round_up
customerRouter.patch("/toggle-round-up/:userId", (req, res, next) => {
  return customerController.toggleRoundUp(req, res, next);
});

module.exports = { customerRouter };
