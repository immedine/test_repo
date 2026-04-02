'use strict';

module.exports = function (app) {
  const userProfile = app.module.user.profile;

  const getProfile = (req, res, next) => {
    userProfile
      .getProfile(req.token)
      .then((data) => {
        req.workflow.outcome.data = app.utility.format.user(data);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateProfile = (req, res, next) => {
    userProfile
      .updateProfile(req.session.user, req.body)
      .then((data) => {
        req.workflow.outcome.data = app.utility.format.user(data);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const logout = (req, res, next) => {
    userProfile
      .logout({
        token: req.token,
        deviceType: req.headers['x-auth-devicetype'],
        deviceId: req.headers['x-auth-deviceid'],
      })
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  const deleteAccount = (req, res, next) => {
    userProfile
      .deleteAccount(req.session.user)
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  const updatePreference = (req, res, next) => {
    userProfile
      .updatePreference(req.token, req.body)
      .then((data) => {
        req.workflow.outcome.data = app.utility.format.user(data);
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const changePassword = (req, res, next) => {
    userProfile
      .changePassword(req.session.user, req.body.oldPassword, req.body.newPassword)
      .then(() => req.workflow.emit('response'))
      .catch(next);
  };

  return {
    getProfile,
    updateProfile,
    changePassword,
    updatePreference,
    logout,
    deleteAccount,
  };
};
