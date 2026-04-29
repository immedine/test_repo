'use strict';

/**
 * This Controller handles all functionality of restaurantOwner auth
 * @module Controllers/RestaurantOwner/Auth
 */
module.exports = function (app) {
  const { OAuth2Client } = require('google-auth-library');
  /**
   * restaurantOwner module
   * @type {Object}
   */
  const restaurantOwner = app.module.restaurantOwner;
  const restaurant = app.module.restaurant;
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  /**
   * Login
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const login = (req, res, next) => {
    restaurantOwner.auth
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
      .then((output) => {
        if (!output.userDoc.isFranchise) {
          return Promise.resolve(output);
        } else {
          if (!output.userDoc.registeredDevice?.length) {
            return Promise.reject({
              errCode: 'DEVICE_NOT_REGISTERED',
            })
          } else {
            const isRegisteredDevice = output.userDoc.registeredDevice.some(each => each.deviceId === req.headers['x-auth-deviceid'] && each.deviceType?.toString() === req.headers['x-auth-devicetype']?.toString());

            if (isRegisteredDevice) {
              return Promise.resolve(output);
            } else {
              return Promise.reject({
                errCode: 'DEVICE_NOT_REGISTERED',
              })
            }
          }
        }
      })
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

  const loginWithRestaurant = (req, res, next) => {
    restaurantOwner.auth
      .loginWithRestaurant(
        {
          deviceType: req.headers['x-auth-devicetype'],
          deviceId: req.headers['x-auth-deviceid'],
        },
        {
          email: req.body.email,
          password: req.body.password,
          restaurantId: req.body.restaurantId
        }
      )
      .then((output) => {
        if (!output.userDoc.isFranchise) {
          return Promise.resolve(output);
        } else {
          if (!output.userDoc.registeredDevice?.length) {
            return Promise.reject({
              errCode: 'DEVICE_NOT_REGISTERED',
            })
          } else {
            const isRegisteredDevice = output.userDoc.registeredDevice.some(each => each.deviceId === req.headers['x-auth-deviceid'] && each.deviceType?.toString() === req.headers['x-auth-devicetype']?.toString());

            if (isRegisteredDevice) {
              return Promise.resolve(output);
            } else {
              return Promise.reject({
                errCode: 'DEVICE_NOT_REGISTERED',
              })
            }
          }
        }
      })
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

  const socialLoginWithRestaurant = (req, res, next) => {
    restaurantOwner.auth
      .socialLoginWithRestaurant(
        {
          socialType: req.body.provider,
          socialId: req.body.socialId,
          fullName: req.body.fullName,
          email: req.body.email,
          restaurantId: req.body.restaurantId
        }
      )
      .then((output) => {
        if (output.message && output.message === "NEW_REGISTER") {
          req.workflow.outcome.data = output;
          req.workflow.emit('response');
        } else {
          return new Promise.resolve(output);
        }
      })
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

  const socialLogin = async (req, res, next) => {

    const verifyResult = await verifyGoogleToken(req.body.token);

    if (!verifyResult.valid) {
      return next({
        errCode: 'INVALID_SOCIAL_TOKEN'
      });
    }

    restaurantOwner.auth
      .socialLogin(
        {
          socialType: req.body.provider,
          socialId: req.body.socialId,
          fullName: req.body.fullName,
          email: req.body.email,
        }
      )
      .then((output) => {
        if (output.message && output.message === "NEW_REGISTER") {
          req.workflow.outcome.data = output;
          req.workflow.emit('response');
        } else {
          return new Promise.resolve(output);
        }
      })
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

  const multiRoleLogin = (req, res, next) => {
    restaurantOwner.auth
      .multiRoleLogin(
        {
          deviceType: req.headers['x-auth-devicetype'],
          deviceId: req.headers['x-auth-deviceid'],
        },
        {
          email: req.body.email,
          password: req.body.password,
        }
      )
      .then((output) => {
        // console.log(output, 'output');
        if (output.userDocs.length === 1) {
          return Promise.resolve({
            userDoc: output.userDocs[0],
            userType: output.userType
          });
        } else {
          req.workflow.outcome.data = {
            users: output.userDocs.map((userDoc) => app.utility.format.user(userDoc)).map((user) => {
              return {
                _id: user._id,
                personalInfo: user.personalInfo,
                roleInfo: user.roleInfo,
                accountStatus: user.accountStatus,
                isFranchise: user.isFranchise,
                restaurantRef: {
                  _id: user.restaurantRef._id,
                  name: user.restaurantRef.name,
                  logo: user.restaurantRef.logo,
                }
              }
            })
          };
          req.workflow.emit('response');
        }
      })
      .then((output) => {
        if (!output.userDoc.isFranchise) {
          return Promise.resolve(output);
        } else {
          if (!output.userDoc.registeredDevice?.length) {
            return Promise.reject({
              errCode: 'DEVICE_NOT_REGISTERED',
            })
          } else {
            const isRegisteredDevice = output.userDoc.registeredDevice.some(each => each.deviceId === req.headers['x-auth-deviceid'] && each.deviceType?.toString() === req.headers['x-auth-devicetype']?.toString());

            if (isRegisteredDevice) {
              return Promise.resolve(output);
            } else {
              return Promise.reject({
                errCode: 'DEVICE_NOT_REGISTERED',
              })
            }
          }
        }
      })
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

  const registerDevice = (req, res, next) => {
    restaurantOwner.auth
      .registerDevice(
        {
          deviceType: req.headers['x-auth-devicetype'],
          deviceId: req.headers['x-auth-deviceid'],
        },
        {
          email: req.body.email,
          deviceRegistrationCode: req.body.deviceRegistrationCode,
        }
      )
      .then((output) => {
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
    restaurantOwner.auth.forgotPassword
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
    restaurantOwner.auth.forgotPassword
      .verify(req.body.token, req.body.password)
      .then((output) => req.workflow.emit('response'))
      .catch(next);
  };

  const signupRequest = (req, res, next) => {
    restaurant.create({
      name: req.body.restaurantDetails.name,
      introductoryText: req.body.restaurantDetails.introductoryText,
      status: app.config.contentManagement.restaurant.unPublished
    })
      .then((output) => {
        // req.workflow.outcome.data = output;
        const data = {
          personalInfo: {
            fullName: req.body.ownerDetails.fullName,
            phone: req.body.ownerDetails.phone,
            email: req.body.ownerDetails.email,
            password: req.body.ownerDetails.password
          },
          restaurantRef: output._id,
          from: 'signup'
        };
        if (req.body.socialId) {
          data.socialInfo = [{ socialId: req.body.socialId, socialType: req.body.provider }];
          data.loginType = app.config.user.loginType[req.body.provider];
          data.accountStatus = app.config.user.accountStatus.restaurantOwner.active;
        }
        restaurantOwner.crud.add(data)
          .then((output1) => {
            if (output1.user) {
              req.workflow.outcome.data = {
                user: app.utility.format.user(output1.user),
                skip: output1.skip
              };
            }
            
            req.workflow.emit('response');
          })
          .catch(next);
      })
      .catch(next);
  };

  const verifyToken = (req, res, next) => {
    const { token } = req.body;
    restaurantOwner.auth
      .verifyToken(token, 'reset')
      .then((output) => {
        // req.workflow.outcome.data = app.utility.format.user(output);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const verifyRegistrationToken = (req, res, next) => {
    const { token } = req.body;
    restaurantOwner.auth
      .verifyToken(token, 'registration')
      .then(async (output) => {
        // console.log("verify token output", output);
        if (output.restaurantActive) {
          await restaurant.set(output.restaurantRef, {
            status: app.config.contentManagement.restaurant.active
          });
        }
        req.workflow.outcome.data = app.utility.format.user(output);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  async function verifyGoogleToken(idToken) {
    try {
      console.log('Verifying Google token:', idToken);
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID, // must match
      });

      const payload = ticket.getPayload();

      console.log('Google token verified successfully. Payload:', payload);

      return {
        valid: true,
        socialId: payload.sub,       // Google user ID
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      console.error('Error verifying Google token:', error);
      return { valid: false, error: error.message };
    }
  }

  const multiSocialLogin = async (req, res, next) => {
    const verifyResult = await verifyGoogleToken(req.body.token);

    if (!verifyResult.valid) {
      return next({
        errCode: 'INVALID_SOCIAL_TOKEN'
      });
    }

    restaurantOwner.auth
      .multiSocialLogin(
        {
          socialType: req.body.provider,
          socialId: req.body.socialId,
          fullName: req.body.fullName,
          email: req.body.email,
        }
      )
      .then((output) => {
        if (output.message && output.message === "NEW_REGISTER") {
          req.workflow.outcome.data = output;
          req.workflow.emit('response');
        } else {
          if (output.userDocs.length === 1) {
            return Promise.resolve({
              userDoc: output.userDocs[0],
              userType: output.userType
            });
          } else {
            req.workflow.outcome.data = {
              users: output.userDocs.map((userDoc) => app.utility.format.user(userDoc)).map((user) => {
                return {
                  _id: user._id,
                  personalInfo: user.personalInfo,
                  roleInfo: user.roleInfo,
                  accountStatus: user.accountStatus,
                  isFranchise: user.isFranchise,
                  restaurantRef: {
                    _id: user.restaurantRef._id,
                    name: user.restaurantRef.name,
                    logo: user.restaurantRef.logo,
                  }
                }
              })
            };
            req.workflow.emit('response');
          }
        }
      })
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

  const sendVerificationLink = (req, res, next) => {
    restaurantOwner.auth
      .sendVerificationLink(req.body)
      .then((output) => {
        if (process.env.NODE_ENV === 'development') {
          req.workflow.outcome.data = output;
        }
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    login: login,
    multiRoleLogin: multiRoleLogin,
    loginWithRestaurant: loginWithRestaurant,
    socialLoginWithRestaurant,
    forgotPassword: {
      requestOTP: forgotPasswordRequestOTP,
      verifyOTP: forgotPasswordVerifyOTP,
    },
    socialLogin,
    multiSocialLogin,
    verifyToken: verifyToken,
    verifyRegistrationToken: verifyRegistrationToken,
    signupRequest: signupRequest,
    registerDevice: registerDevice,
    sendVerificationLink
  };
};
