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
    useS3: true,
    useFileFilter: true,
    allowedFileTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  });

  /**
   * File upload handling middleware
   * @type {Function}
   */
  const uploadAudio = options.upload(app, {
    useS3: true, // TODO: change it
    useFileFilter: true,
    allowedFileTypes: [
      'audio/mpeg',
      'audio/x-mpeg',
      'audio/mp3',
      'audio/x-mp3',
      'audio/mpeg3',
      'audio/x-mpeg3',
      'audio/mpg',
      'audio/x-mpg',
      'audio/x-mpegaudio',
    ],
  });

  const uploadVideo = options.upload(app, {
    useS3: true, // TODO: change it
    useFileFilter: true,
    allowedFileTypes: [
      'video/mpeg',
      'video/mp4'
    ],
  });

  router.post('/upload-image', [
    uploadImage('image'),
    options.validateFile(schemaValidator.image),
    controllers.uploadImage,
  ]);

  router.post('/upload-audio', [
    uploadAudio('audio'),
    options.validateFile(schemaValidator.audio),
    controllers.uploadAudio,
  ]);

  router.post('/upload-video', [
    uploadVideo('video'),
    options.validateFile(schemaValidator.video),
    controllers.uploadVideo,
  ]);

  return router;
};
