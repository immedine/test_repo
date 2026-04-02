'use strict';

const router = require('express').Router();

module.exports = function (app, options) {
  const schemaValidator = require('./schema-validator')(app);
  const controllers = require('./controller')(app);

  router.post('/update', [options.validateBody(schemaValidator.updateProfile), controllers.updateProfile]);

  router.post('/delete-account', controllers.deleteAccount);

  router.put('/change-password', [options.validateBody(schemaValidator.changePassword), controllers.changePassword]);

  router.put('/logout', controllers.logout);

  router.get('/', controllers.getProfile);

  return router;
};
