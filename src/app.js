const express = require("express");
const { errorHandler } = require("./middleware/errorHandler");
const { customerRouter } = require("./route/customer");
const { walletRouter } = require("./route/wallet");
const { transactionRouter } = require("./route/transaction");

const app = express();
const PORT = 8080;

app.use(express.json());

app.use("/customer", customerRouter);

app.use("/wallet", walletRouter);

app.use("/transaction", transactionRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is successfully running and listening on port ${PORT}`);
});
