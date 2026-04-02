'use strict';

module.exports = function (app) {

  const login = {
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
    password: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
  };

  const socialLogin = {
    provider: {
      type: 'string',
      required: true,
      allowEmpty: false,
      enum: ['google', 'facebook'],
    },
    socialId: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
    firstName: {
      type: 'string',
      allowEmpty: false,
      required: true,
    },
    lastName: {
      type: 'string',
      allowEmpty: false,
      required: true,
    },
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
  };

  const signup = {
    firstName: {
      type: 'string',
      allowEmpty: false,
      required: true,
    },
    lastName: {
      type: 'string',
      allowEmpty: false,
      required: true,
    },
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
    password: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
  };
  
  const signupVerify = {
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
    otp: {
      type: 'string',
      required: true,
      allowEmpty: false,
      length: 4,
    },
  };

  const resendEmailOtp = {
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
  };

  const forgotPasswordRequestOTP = {
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
  };

  const forgotPasswordVerifyOTP = {
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
    otp: {
      type: 'string',
      required: true,
      length: 4,
    },
    password: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
  };

  return {
    forgotPassword: {
      requestOTP: forgotPasswordRequestOTP,
      verifyOTP: forgotPasswordVerifyOTP,
    },
    login,
    socialLogin,
    signup,
    signupVerify,
    resendEmailOtp,
  };
};
