'use strict';

const os = require('os');

/**
 * Formats the image path to reflect the server URL
 * @param  {String} path The path of the image on the storage server
 * @param  {Number} port The port number of the storage server
 * @return {String}      The image url
 */
function formatFileLink(path, port) {
  if (!path) {
    throw new Error('Path is required');
  }

  let interfaces = os.networkInterfaces();

  let addresses = [];

  for (let k in interfaces) {
    for (let k2 in interfaces[k]) {
      let address = interfaces[k][k2];

      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }

  return 'http://' + addresses[0] + ':' + port + '/' + path;
}

/**
 * Custom File Upload module
 * @param  {Express} app               Reference to the server instance
 * @param  {Object}  opts              The options with which to use this module
 * @param  {Object}  opts.localStorage Path from cwd to the folder where files are to be stored, default = public/uploads
 * @param  {Object}  opts.useS3        Whether to use S3 or not if available, default = true
 * @return {Object}                    Object containing file-upload methods
 *
 * If localStorage path doesn't begin with public, then the local file path is stored instead of URL
 */
module.exports = function (app, opts) {
  if (!opts) {
    opts = {};
  }
  const options = {
    localStorage: opts.localStorage || 'public/uploads',
    useFileFilter: opts.useFileFilter || false,
    allowedFileTypes: opts.allowedFileTypes || [],
  };

  /**
   * To handle single or multiple file upload
   */
  const multer = require('multer');

  /**
   * In-built module to handle path
   */
  const path = require('path');

  /**
   * In-built module to handle file system
   */
  const fs = require('fs');

  /**
   * Default upload path
   */
  const dir = path.resolve(process.cwd(), options.localStorage);

  /**
   * If AWS-S3 configuration is provided then initializes s3Util
   */
  const s3Util = app.config.aws.s3 ? app.utility.s3Util : null;

  /**
   * If upload directory doesn't exist, create it
   */
  if (!fs.existsSync(dir)) {
    app.utility.mkdirR(dir, console.log);
  }

  function fileFilter(req, file, cb) {
    if (!options.useFileFilter) {
      cb(null, true);
    } else {
      if (options.allowedFileTypes.some((each) => file.mimetype === each)) {
        cb(null, true);
      } else {
        req.invalidFileError = true;
        cb(null, false);
      }
    }
  }

  /**
   * Initializing multer
   */
  const upload = multer({
    /**
     * Creating multer storage settings
     */
    storage: multer.diskStorage({
      /**
       * Setting upload destination in multer
       */
      destination: function (req, file, cb) {
        console.log('destination', dir);
        cb(null, dir);
      },

      /**
       * Setting filename convention in multer
       */
      filename: function (req, file, cb) {
        cb(null, app.utility.generateUniqueKey() + path.extname(file.originalname));
      },
    }),
    fileFilter: fileFilter,
  });

  /**
   * Store locally.
   * @param  {Object}   req      The request object
   * @param  {Function} callback The callback function
   */
  function storeFiles(req, callback) {
      /**
       * The path to be stored in the database
       * @type {String}
       */
      let storePath = '';

      // Check if the file is meant to accessible publicly
      if (options.localStorage.substring(0, options.localStorage.indexOf('/')) === 'public') {
        /**
         * Local path where file is present (excluding, the 'public' folder)
         * @type {String}
         */
        // storePath = req.protocol + '://' + req.get('host') + '/' + options.localStorage.substring(options.localStorage.indexOf('/') + 1);
        storePath = formatFileLink(
          options.localStorage.substring(options.localStorage.indexOf('/') + 1),
          app.config.server.port
        );
      } else {
        storePath = path.resolve(process.cwd(), options.localStorage);
      }

      /**
       * Setting the `getPath` property in each file. This `getPath` will be stored in database
       */
      Object.keys(req.files).forEach(function (e) {
        req.files[e][0].getPath = storePath + '/' + req.files[e][0].filename;
        req.files[e] = req.files[e][0];
      });

      callback();
  }

  /**
   * Returns a middleware function to handle single or multiple-file upload using Multer
   * @param  {String|String[]} fields Array of field names
   * @return {Function}               Middleware
   */
  const uploadFiles = function (fields) {
    if (!Array.isArray(fields)) {
      fields = [fields];
    }
    //////////////////////////////////////////////////////////////////////
    // Converting the field names to object-array as accepted by Multer //
    //////////////////////////////////////////////////////////////////////
    fields = fields.map((e) => {
      return {
        name: e,
        maxCount: 1,
      };
    });
    return function (req, res, next) {
      upload.fields(fields)(req, res, (error) => {
        if (req.invalidFileError) {
          return next({
            errCode: 'INVALID_FILE_TYPE',
          });
        }
        if (error) {
          return next(error);
        }

        if (!req.hasOwnProperty('files')) {
          req.files = {};
          return next();
        }
        return storeFiles(req, (error) => {
          if (error) {
            return next(error);
          }
          console.log('req.files', req.files);
          next();
        });
      });
    };
  };

  return uploadFiles;
};
