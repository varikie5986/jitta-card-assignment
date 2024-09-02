const customerService = require("../service/customer");
const { successStatus } = require("../common/status");

const login = async (req, res, next) => {
  try {
    const validationResponse = validateInput(req);
    if (validationResponse) {
      res.status(400);
      return next(validationResponse);
    }

    const { userName } = req.body;

    const loginResult = await customerService.login(
      convertToLowerCase(userName)
    );

    if (loginResult.success) {
      return res.status(200).json({
        status: successStatus,
      });
    } else {
      res.status(401);
      return next(new Error("User does not exist"));
    }
  } catch (error) {
    console.error("Error while login:", error);
    res.status(500);
    return next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const validationResponse = validateInput(req);
    if (validationResponse) {
      res.status(400);
      return next(validationResponse);
    }

    const { userName } = req.body;

    const registerResult = await customerService.register(
      convertToLowerCase(userName)
    );

    if (registerResult.success) {
      return res.status(200).json({
        status: successStatus,
        data: registerResult.data,
      });
    } else {
      res.status(401);
      return next(new Error("Username already exists"));
    }
  } catch (error) {
    console.error("Error while register:", error);
    res.status(500);
    return next(error);
  }
};

const toggleRoundUp = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roundUp } = req.body;

    if (typeof roundUp !== "boolean") {
      res.status(400);
      return next(new Error("roundUp need to be in type boolean"));
    }

    const updatedUser = await customerService.toggleRoundUp(userId, roundUp);
    return res.status(200).json({
      status: successStatus,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error while toggleRoundUp:", error);
    res.status(500);
    return next(error);
  }
};

const validateInput = (req) => {
  // * Some logic to validate request
  if (!req.body.userName) {
    return new Error("Username is required");
  }
  return null;
};

const convertToLowerCase = (str) => str.toLowerCase();

module.exports = { login, register, toggleRoundUp };
