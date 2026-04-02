'use strict';

/**
 * creates Some file handling functions for handling file
 * @class
 */
class FileHandle {
  constructor() {
    this.fs = require('fs-extra');
    this.message = require('../message');
  }

  /**
   * clear all files that is send over the multipart
   * @this   FileHandle
   * @param  {Array} files               array of files with the property of path to remove the file
   */
  clearFiles(files) {
    var keys = Object.keys(files),
      me = this,
      temp;
    keys.forEach(function (eachKey) {
      temp = Array.isArray(files[eachKey]) ? files[eachKey] : [files[eachKey]];
      temp.forEach(function (eachFile) {
        if (eachFile.path && typeof eachFile.path === 'string') {
          me.removeFile(eachFile.path, function () {});
        }
      });
    });
  }

  /**
   * clear a single file
   * @this   FileHandle
   * @param  {String} path  path to remove the file
   */
  removeFile(path) {
    this.fs.unlink(path, function () {});
  }

  /**
   * move a file from one folder to another folder
   * @this   FileHandle
   * @param  {object} config                    configuration object
   * @param  {String} config.sourcePath       source path of the file
   * @param  {String} config.destinationPath    destination or target path of the file
   * @param  {requestCallback} callback         The callback that handles the response.
   * @return {String} destination path where the file will be moved
   */
  move(config, callback) {
    var error = {};
    if (!config.destinationPath) {
      error.destinationPath = this.message.REQUIRED('destinationPath');
    }
    if (!config.sourcePath) {
      error.sourcePath = this.message.REQUIRED('sourcePath');
    }
    if (Object.keys(error).length) {
      return callback(new Error(JSON.stringify(error)));
    }
    this.fs.rename(config.sourcePath, config.destinationPath, function (err) {
      if (err) {
        return callback(err);
      } else {
        return callback(null, config.destinationPath);
      }
    });
  }
}

module.exports = new FileHandle();
