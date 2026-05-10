const { validationResult } = require('express-validator');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: extractedErrors
    });
  }
  
  next();
};

module.exports = { validate };
