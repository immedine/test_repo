'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR ADMIN USER MODULE //
///////////////////////////////////////////////////

/**
 * The express router
 * @type {Express.Router}
 */
const router = require('express').Router();

/**
 * @param  {Express} app     The express app reference
 * @param  {Object}  options The options for this module
 * @return {Object}          The revealed module
 */
module.exports = function (app, options) {
  /**
   * File upload handling middleware
   * @type {Function}
   */
  const uploadImage = options.upload(app, {
    useS3: true, // TODO: change it
    useFileFilter: true,
    allowedFileTypes: ['image/png', 'image/jpeg', 'image/jpg'],
  });

  /**
   * The JSON-Schema for these APIs
   * @type {Object}
   */
  const schemaValidator = require('./schema-validator')(app);

  /**
   * The Controllers for these APIs
   * @type {Object}
   */
  const controllers = require('./controller')(app);

  /**
   * Logout
   */
  router.put('/logout', controllers.logout);

  /**
   * Profile
   */
  router
    .route('/')
    .get(controllers.getProfile)
    .put([
      uploadImage('profilePicture'),
      options.validateFile(schemaValidator.profilePhoto),
      options.validateBody(schemaValidator.set),
      controllers.setProfile,
    ]);

  /**
   * Change Password
   */
  router.put('/change-password', [options.validateBody(schemaValidator.changePassword), controllers.changePassword]);

  return router;
};
