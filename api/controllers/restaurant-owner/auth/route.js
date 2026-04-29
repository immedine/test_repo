'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR ADMIN USER MODULE //
///////////////////////////////////////////////////

/**
 * The express router
 * @type {Express.Router}
 */
const router = require('express').Router();

/**
 * @param  {Express} app     The express app reference
 * @param  {Object}  options The options for this module
 * @return {Object}          The revealed module
 */
module.exports = function (app, options) {
  /**
   * The JSON-Schema for these APIs
   * @type {Object}
   */
  const schemaValidator = require('./schema-validator')(app);

  /**
   * The Middlewares for these APIs
   * @type {Object}
   */
  const middlewares = require('./middlewares')(app);

  /**
   * The Controller for these APIs
   * @type {Object}
   */
  const controllers = require('./controller')(app);

  /**
   * Custom Login
   */
  router.post('/login', [options.validateBody(schemaValidator.login), controllers.login]);
  router.post('/multi-login', [options.validateBody(schemaValidator.login), controllers.multiRoleLogin]);
  router.post('/login-with-restaurant', [options.validateBody(schemaValidator.loginWithRestaurant), controllers.loginWithRestaurant]);
  router.post('/register-device', [options.validateBody(schemaValidator.registerDevice), controllers.registerDevice]);

  /**
   * Forgot Password request OTP
   */
  router.post('/forgot-password/request-otp', [
    options.validateBody(schemaValidator.forgotPassword.requestOTP),
    controllers.forgotPassword.requestOTP,
  ]);

  router.post('/verify-token', [
    controllers.verifyToken,
  ]);

  router.post('/verify-registration-token', [
    controllers.verifyRegistrationToken,
  ]);

  router.post('/social-login', [options.validateBody(schemaValidator.socialLogin), controllers.socialLogin]);
  router.post('/multi-social-login', [options.validateBody(schemaValidator.socialLogin), controllers.multiSocialLogin]);
  router.post('/social-login-with-restaurant', [options.validateBody(schemaValidator.socialLoginWithRestaurant), controllers.socialLoginWithRestaurant]);

  router.post('/send-verification-link', [options.validateBody(schemaValidator.sendVerificationLink), controllers.sendVerificationLink]);

  /**
   * Forgot Password verify OTP
   */
  router.post('/forgot-password/verify-otp', [
    options.validateBody(schemaValidator.forgotPassword.verifyOTP),
    controllers.forgotPassword.verifyOTP,
  ]);

  router.post('/signup', [options.validateBody(schemaValidator.signup), controllers.signupRequest]);

  return router;
};
