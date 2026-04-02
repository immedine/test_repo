'use strict';

module.exports = function (app) {
  const user = app.module.user;

  const signupVerify = (req, res, next) => {
    user.auth
      .signupVerify({
        email: req.body.email,
        otp: req.body.otp
      })
      .then((output) => {
        return app.module.session.set(
          app.config.user.role.user,
          output.userDoc,
          req.headers['x-auth-devicetype'],
          req.headers['x-auth-deviceid'],
          req.headers['x-auth-notificationkey']
        );
      })
      .then((output) => {
        req.workflow.outcome.data = {
          accessToken: output.accessToken,
          refreshToken: output.refreshToken,
          user: app.utility.format.user(output.userId),
        };
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const signupRequest = (req, res, next) => {
    user.auth
      .signupRequest(req.body)
      .then((output) => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const resendEmailOtp = (req, res, next) => {
    user.auth
      .resendEmailOtp(req.body)
      .then((output) => {
        if (process.env.NODE_ENV === 'development') {
          req.workflow.outcome.data = output;
        }
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const login = (req, res, next) => {
    user.auth
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
          user: app.utility.format.user(output.userId),
        };
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const socialLogin = (req, res, next) => {
    user.auth
      .socialLogin(
        {
          deviceType: req.headers['x-auth-devicetype'],
          deviceId: req.headers['x-auth-deviceid'],
        },
        {
          socialType: req.body.provider,
          socialId: req.body.socialId,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
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
          user: app.utility.format.user(output.userId),
        };
        req.workflow.emit('response');
      })
      .catch(next);
  }

  const forgotPasswordRequestOTP = (req, res, next) => {
    user.auth.forgotPassword
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

  const forgotPasswordVerifyOTP = (req, res, next) => {
    user.auth.forgotPassword
      .verify(req.body.email, req.body.otp, req.body.password)
      .then((output) => req.workflow.emit('response'))
      .catch(next);
  };

  return {
    forgotPassword: {
      requestOTP: forgotPasswordRequestOTP,
      verifyOTP: forgotPasswordVerifyOTP,
    },
    login,
    socialLogin: socialLogin,
    signupRequest,
    signupVerify,
    resendEmailOtp,
  };
};
