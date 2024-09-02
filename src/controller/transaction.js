const transactionService = require("../service/transaction");
const { successStatus } = require("../common/status");

const getTransactions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { walletType, transactionType, startDate, endDate } = req.query;

    const transactions = await transactionService.getTransactions(
      userId,
      walletType,
      transactionType,
      startDate,
      endDate
    );

    if (transactions.length > 0) {
      return res.status(200).json({
        status: successStatus,
        data: transactions,
      });
    } else {
      res.status(404);
      return next(new Error("No transactions found for the user"));
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500);
    return next(error);
  }
};

module.exports = { getTransactions };
