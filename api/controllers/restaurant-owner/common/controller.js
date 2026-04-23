'use strict';
/**
 * This Controller handles all functionality of admin common routes
 * @module Controllers/Admin/Common
 */
const removeS3Prefix = (url) => {
  if (!url) return url;

  // Virtual-hosted
  let cleaned = url.replace(
    /^https:\/\/[^.]+\.s3\.[^.]+\.amazonaws\.com\//,
    ""
  );

  // Path-style
  cleaned = cleaned.replace(
    /^https:\/\/s3\.[^.]+\.amazonaws\.com\/[^/]+\//,
    ""
  );

  return cleaned;
};
module.exports = (app) => {
  const { Worker } = require("worker_threads");
  const path = require("path");
  const menu = app.module.menu;

  const runOpenAIWorker = (imageUrl) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        path.resolve(__dirname, "../../workers/openaiWorker.js")
      );

      worker.postMessage({ imageUrl });

      worker.on("message", (msg) => {
        if (msg.success) resolve(msg.data);
        else reject(new Error(msg.error));
        worker.terminate();
      });

      worker.on("error", (err) => {
        console.error("Worker thread error:", err);
        reject(err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with code ${code}`));
        }
      });
    });
  };

  const uploadImage = (req, res, next) => {
    req.workflow.outcome.data = removeS3Prefix(req.files.image.getPath);
    req.workflow.emit('response');
  };

  const uploadImages = (req, res, next) => {
    req.workflow.outcome.data = req.files.map(eachImage => removeS3Prefix(eachImage.getPath));
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

  const extractMenu = async (req, res, next) => {

    try {


      console.log("in here ")
      const { imageUrl } = await req.body;
      // const imageUrl = 'https://immedine-bucket.s3.ap-south-1.amazonaws.com/app/dev/mo1p5u7j0pqkfbed4bce3byg.jpg';

      const result = await runOpenAIWorker(imageUrl);

      let data;
      try {
        data = JSON.parse(result);
        await menu.bulkUpload(data, req.session.user);
      } catch {
        data = { error: "Invalid JSON", raw: result };
      }
      // console.log("data ", data)
      await app.utility.removeFile(imageUrl);
      req.workflow.outcome.data = { menu: data };
      req.workflow.emit('response');
    } catch (err) {
      console.error("Error in extractMenu controller:", err);
      next({ errCode: 'MENU_EXTRACTION_FAILED', message: err.message });
    }
  };

  return { uploadImage, uploadAudio, uploadVideo, uploadImages, extractMenu };
};
