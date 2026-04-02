'use strict';

const router = require('express').Router();

module.exports = function (app, options) {
  const schemaValidator = require('./schema-validator')(app);
  const controllers = require('./controller')(app);

  router.post('/login', [options.validateBody(schemaValidator.login), controllers.login]);
  
  router.post('/social-login', [options.validateBody(schemaValidator.socialLogin), controllers.socialLogin]);

  router.post('/signup', [options.validateBody(schemaValidator.signup), controllers.signupRequest]);
  router.post('/signup/verify', [options.validateBody(schemaValidator.signupVerify), controllers.signupVerify]);

  router.post('/resend-email-otp', [options.validateBody(schemaValidator.resendEmailOtp), controllers.resendEmailOtp]);


  router.post('/forgot-password/request-otp', [
    options.validateBody(schemaValidator.forgotPassword.requestOTP),
    controllers.forgotPassword.requestOTP,
  ]);

  router.post('/forgot-password/verify-otp', [
    options.validateBody(schemaValidator.forgotPassword.verifyOTP),
    controllers.forgotPassword.verifyOTP,
  ]);

  return router;
};
