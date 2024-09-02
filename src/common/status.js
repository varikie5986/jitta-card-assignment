const errorStatusCode = {
  VALIDATION_ERROR: 400,
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401,
};

const validationError = {
  code: 9300,
  desc: "",
};

const internalError = {
  code: 9100,
  desc: "",
};

const anyError = {
  code: 9999,
  desc: "",
};

const unauthorizedError = {
  code: 9001,
  desc: "",
};

const successStatus = {
  code: 1000,
  desc: "SUCCESS",
};

module.exports = {
  errorStatusCode,
  validationError,
  internalError,
  anyError,
  unauthorizedError,
  successStatus,
};
