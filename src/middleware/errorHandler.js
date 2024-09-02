const {
  errorStatusCode,
  validationError,
  internalError,
  anyError,
  unauthorizedError,
} = require("../common/status");

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode;
  switch (statusCode) {
    case errorStatusCode.VALIDATION_ERROR:
      const validateErrorResp = validationError;
      validateErrorResp["desc"] = err.message;
      res.json({ status: validateErrorResp });
    case errorStatusCode.INTERNAL_SERVER_ERROR:
      const internalErrorResp = internalError;
      internalErrorResp["desc"] = err.message;
      res.json({ status: internalErrorResp });
    case errorStatusCode.UNAUTHORIZED:
      const unauthorizedErrorResp = unauthorizedError;
      unauthorizedErrorResp["desc"] = err.message;
      res.json({ status: unauthorizedErrorResp });
    default:
      const anyErrorResp = anyError;
      anyErrorResp["desc"] = err.message;
      res.json({ status: anyErrorResp });
  }
};

module.exports = { errorHandler };
