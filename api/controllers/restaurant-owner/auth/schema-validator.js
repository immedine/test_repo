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

  const loginWithRestaurant = {
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
    restaurantId: {
      type: 'string',
      required: true,
      allowEmpty: false,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  }

  const registerDevice = {
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
    deviceRegistrationCode: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
  };

  /////////////////////
  // Forgot Password //
  /////////////////////
  const forgotPasswordRequestOTP = {
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
  };

  const forgotPasswordVerifyOTP = {
    token: {
      type: 'string',
      required: true,
      allowEmpty: false,
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
      enum: ['google'],
    },
    socialId: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
    fullName: {
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
    token: {
      type: 'string',
      required: true,
      allowEmpty: false
    },
  };

  const socialLoginWithRestaurant = {
    provider: {
      type: 'string',
      required: true,
      allowEmpty: false,
      enum: ['google'],
    },
    socialId: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
    fullName: {
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
    token: {
      type: 'string',
      required: true,
      allowEmpty: false
    },
    restaurantId: {
      type: 'string',
      required: true,
      allowEmpty: false,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  const signup = {
    ownerDetails: {
      fullName: {
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
        type: 'string'
      },
    },
    restaurantDetails: {
      name: {
        type: 'string',
        allowEmpty: false,
        required: true,
      },
      introductoryText: {
        type: 'string'
      },
    }

  };

  const sendVerificationLink = {
    email: {
      type: 'string',
      required: true,
      allowEmpty: false,
      format: 'email',
    },
  };

  return {
    login: login,
    loginWithRestaurant: loginWithRestaurant,
    forgotPassword: {
      requestOTP: forgotPasswordRequestOTP,
      verifyOTP: forgotPasswordVerifyOTP,
    },
    registerDevice: registerDevice,
    signup: signup,
    socialLogin,
    socialLoginWithRestaurant,
    sendVerificationLink
  };
};
