'use strict';
/**
 * This Controller handles all functionality of admin profile
 * @module Controllers/Admin/Profile
 */
module.exports = function (app) {
  /**
   * admin module
   * @type {Object}
   */
  const admin = app.module.admin;

  /**
   * Get Profile
   * @param  {Object}   req  Request
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getProfile = (req, res, next) => {
    req.workflow.outcome.data = app.utility.format.admin(req.session.user);
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
    if (req.files.profilePicture) {
      req.body.profilePicture = req.files.profilePicture.getPath;
    }

    admin.profile
      .set(req.session.user, req.body)
      .then((profile) => {
        req.workflow.outcome.data = app.utility.format.admin(profile);
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
    admin.profile
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
    admin.profile
      .logout({
        token: req.headers['x-auth-token'],
        deviceType: req.headers['x-auth-devicetype'],
        deviceId: req.headers['x-auth-deviceid'],
      })
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  return {
    getProfile: getProfile,
    setProfile: setProfile,
    changePassword: changePassword,
    logout: logout,
  };
};
