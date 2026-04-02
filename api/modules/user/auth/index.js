'use strict';

module.exports = function (app) {
  const User = app.models.User;

  const signupRequest = function (payload) {
    const { firstName, lastName, email, password } = payload;
    const personalInfo = {
      firstName,
      lastName,
      email,
    };
    return User.signup({ personalInfo, password });
  };

  const signupVerify = (payload) => {
    const { email, otp } = payload;
    const randomPassword =
      process.env.NODE_ENV === 'testing' || process.env.NODE_ENV === 'development'
        ? process.env.CANDIDATE_DEFAULT_PASSWORD || ''
        : puid.generate();

    return User.signupVerify({ email, otp }).then(({ userDoc }) => {
      // app.module.sendEmail.user.signupConfirmation({
      //   userId: userDoc._id,
      //   userType: app.config.user.role.user,
      //   emailId: userDoc.personalInfo.email,
      //   firstName: userDoc.personalInfo.firstName,
      //   password: randomPassword,
      // });
      return Promise.resolve({ userDoc });
    });
  };

  const resendMobileOtp = ({ phone }) => {
    return User.resendMobileOtp(phone);
  };

  const resendEmailOtp = ({ email }) => {
    return User.resendEmailOtp(email);
  };

  const login = function (headerData, loginData) {
    return User.loginValidate(loginData.email, loginData.password).then((output) => {
      if (output.userDoc.accountStatus === app.config.user.accountStatus.user.blocked) {
        return Promise.reject({ errCode: 'USER_BLOCKED' });
      } else {
        return Promise.resolve(output);
      }
    });
  };

  const forgotPasswordCreateOTP = function (email) {
    return User.forgotPasswordCreateOTP(email);
  };

  const forgotPasswordVerifyOTP = function (email, otp, password) {
    return User.forgotPasswordVerifyOTP(email, otp, password);
  };

  const socialLogin = function (headerData, loginData) {
    return User.socialLoginValidate(
      loginData.socialId,
      loginData.socialType,
      loginData.firstName,
      loginData.lastName,
      loginData.email
    ).then((output) => {
      if (output.userDoc.accountStatus === app.config.user.accountStatus.user.blocked) {
        return Promise.reject({ errCode: 'USER_BLOCKED' });
      } else {
        return Promise.resolve(output);
      }
    });
  }

  return {
    login,
    forgotPassword: {
      create: forgotPasswordCreateOTP,
      verify: forgotPasswordVerifyOTP,
    },
    signupRequest,
    signupVerify,
    resendMobileOtp,
    resendEmailOtp,
    socialLogin
  };
};
