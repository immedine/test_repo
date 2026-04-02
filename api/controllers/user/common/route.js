'use strict';

///////////////////////////////////////////////////
// THIS IS THE ROUTE FILE FOR ADMIN COMMON MODULE //
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
   * The JSON-Schema for these APIs
   * @type {Object}
   */
  const schemaValidator = require('./schema-validator')(app);

  /**
   * The Controller for these APIs
   * @type {Object}
   */
  const controllers = require('./controller')(app);

  /**
   * File upload handling middleware
   * @type {Function}
   */
  const uploadImage = options.upload(app, {
    useS3: true, // TODO: change it
    useFileFilter: true,
    allowedFileTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  });

  router.post('/upload-image', [
    uploadImage('image'),
    options.validateFile(schemaValidator.image),
    controllers.uploadImage,
  ]);

  router.post('/search-city-story', [
    options.validateBody(schemaValidator.searchCityStory),
    controllers.searchCityStory
  ]);

  return router;
};
