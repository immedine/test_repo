'use strict';
/**
 * This Controller handles all functionality of restaurantOwner profile
 * @module Controllers/RestaurantOwner/Profile
 */
module.exports = function (app) {
  /**
   * restaurantOwner module
   * @type {Object}
   */
  const restaurantOwner = app.module.restaurantOwner;

  /**
   * Get Profile
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getProfile = (req, res, next) => {
    req.workflow.outcome.data = app.utility.format.user(req.session.user);
    req.workflow.emit('response');
  };

  /**
   * Set Profile
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const setProfile = (req, res, next) => {
    // console.log("req.body", req.body)
    restaurantOwner.profile
      .set(req.session.user, req.body)
      .then((profile) => {
        req.workflow.outcome.data = app.utility.format.user(profile);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Change Password
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const changePassword = (req, res, next) => {
    restaurantOwner.profile
      .changePassword(req.session.user, req.body.oldPassword, req.body.newPassword)
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  /**
   * Logout
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const logout = (req, res, next) => {
    restaurantOwner.profile
      .logout({
        token: req.token,
        deviceType: req.headers['x-auth-devicetype'],
        deviceId: req.headers['x-auth-deviceid'],
      })
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  const generatePin = (req, res, next) => {
    restaurantOwner.profile
      .generatePin(req.session.user)
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  const verifyPin = (req, res, next) => {
    if (req.session.user.securityPinDetails.pin === req.body.pin) {
      req.workflow.emit('response');
    } else {
      return next({ 'errCode': 'INVALID_PIN' });
    }
  };

  const changeRestaurant = (req, res, next) => {
    console.log("change restaurant req.body", req.headers, req.session.user);
    // req.workflow.emit('response');
    restaurantOwner.auth
      .changeRestaurant(
        {
          deviceType: req.headers['x-auth-devicetype'],
          deviceId: req.headers['x-auth-deviceid'],
        },
        {
          email: req.session.user.personalInfo.email,
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

  return {
    getProfile: getProfile,
    setProfile: setProfile,
    changePassword: changePassword,
    logout: logout,
    generatePin: generatePin,
    verifyPin: verifyPin,
    changeRestaurant: changeRestaurant
  };
};
