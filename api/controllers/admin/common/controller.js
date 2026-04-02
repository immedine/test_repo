'use strict';
/**
 * This Controller handles all functionality of admin common routes
 * @module Controllers/Admin/Common
 */
module.exports = (app) => {
  const story = app.module.story;

  const uploadImage = (req, res, next) => {
    req.workflow.outcome.data = req.files.image.getPath;
    req.workflow.emit('response');
  };

  const uploadAudio = (req, res, next) => {
    req.workflow.outcome.data = req.files.audio.getPath;
    req.workflow.emit('response');
  };

  const uploadVideo = (req, res, next) => {
    req.workflow.outcome.data = req.files.video.getPath;
    req.workflow.emit('response');
  };

  return { uploadImage, uploadAudio, uploadVideo };
};
