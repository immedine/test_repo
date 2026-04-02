'use strict';

/**
 * This Controller handles all functionality of admin auth
 * @module Controllers/Admin/Auth
 */
module.exports = function (app) {
  /**
   * admin module
   * @type {Object}
   */
  const admin = app.module.admin;

  /**
   * Login
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const login = (req, res, next) => {
    admin.auth
      .login(
        {
          deviceType: req.headers['x-auth-devicetype'],
          deviceId: req.headers['x-auth-deviceid'],
        },
        {
          email: req.body.email,
          password: req.body.password,
        }
      )
      .then((output) =>
        app.module.session.set(
          output.userType,
          output.userDoc,
          req.headers['x-auth-devicetype'],
          req.headers['x-auth-deviceid'],
          req.headers['x-auth-notificationkey']
        )
      )
      .then((output) => {
        req.workflow.outcome.data = {
          accessToken: output.accessToken,
          refreshToken: output.refreshToken,
          user: app.utility.format.admin(output.userId),
        };
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Forgot Password - Request OTP
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const forgotPasswordRequestOTP = (req, res, next) => {
    admin.auth.forgotPassword
      .create(req.body.email)
      .then((output) => {
        if (process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'development') {
          req.workflow.outcome.data = {};
          req.workflow.outcome.data.otp = output.code;
        }

        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Forgot Password - Verify OTP
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const forgotPasswordVerifyOTP = (req, res, next) => {
    admin.auth.forgotPassword
      .verify(req.body.email, req.body.otp, req.body.password)
      .then((output) => req.workflow.emit('response'))
      .catch(next);
  };

  return {
    login: login,
    forgotPassword: {
      requestOTP: forgotPasswordRequestOTP,
      verifyOTP: forgotPasswordVerifyOTP,
    },
  };
};
