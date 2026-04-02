'use strict';

/**
 * creates utility functions for  handling aws s3 requests
 * @class
 * @param {object} config                   configuration object
 * @param {string} config.accessKeyId      access key id of the amazon
 * @param {string} config.secretAccessKey  secret access key id of the amazon
 */
class S3Util {
  constructor(config) {
    const AWS = require('aws-sdk');
    require('aws-sdk/lib/maintenance_mode_message').suppress = true;
    AWS.config.update(config);
    AWS.config.setPromisesDependency(require('bluebird'));
    this.s3 = new AWS.S3({
      maxRetries: config.maxRetries,
      httpOptions: {
        timeout: config.timeout,
      },
      signatureVersion: 'v4',
    });
  }

  /**
   * returns the url of the key after or before uploading an object into the server
   * @this   S3Util
   * @param  {object} config            configuration object
   * @param  {String} config.bucket     name of the bucket object
   * @param  {String} config.key        name of the item inside this bucket
   * @return {String}                   url of the key indide that bucket
   */
  getUrl(config) {
    const url = this.s3.getSignedUrl('getObject', {
      Bucket: config.bucket,
      Key: config.key,
    });
    return url.substr(0, url.indexOf('?'));
  }

  /**
   * remove an existing bucket from amazon s3
   * @this   S3Util
   * @param  {String} bucketName                name of the bucket object
   * @param  {requestCallback} callback         The callback that handles the response.
   * more about the return type in callback
   * {@link http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteBucket-property}
   */
  removeBucket(bucketName, callback) {
    this.s3.deleteBucket(
      {
        Bucket: bucketName,
      },
      callback
    );
  }

  /**
   * remove an existing key from amazon s3 bucket
   * @this   S3Util
   * @param  {object} config            configuration object
   * @param  {String} config.bucket     name of the bucket object
   * @param  {String} config.key        name of the item inside this bucket
   * @param  {requestCallback} callback         The callback that handles the response.
   * more about the return type in callback
   * {@link http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteBucket-property}
   */
  removeObject(config, callback) {
    this.s3.deleteObject(
      {
        Bucket: config.bucket,
        Key: config.key,
      },
      callback
    );
  }

  /**
   * create a bucket in amazon s3
   * @this   S3Util
   * @param  {object} config                    configuration object
   * @param  {String} config.bucket             name of the bucket object
   * @param  {String} config.ACL                ACL of the bucket
   * @param  {requestCallback} callback         The callback that handles the response.
   * @return { Boolean}  if the bucket creation is successfull then true otherwise null
   */
  createBucket(config, callback) {
    this.s3.createBucket(
      {
        Bucket: config.bucket,
        // ACL: config.ACL,
      },
      function (err) {
        if (err) {
          if (err.code === 'BucketAlreadyOwnedByYou') {
            callback(null, true);
          } else {
            callback(err);
          }
        } else {
          callback(null, true);
        }
      }
    );
  }

  /**
   * upload a file into an amazon bucket
   * @this   S3Util
   * @param  {object} config                    configuration object
   * @param  {String} config.bucket             name of the bucket object
   * @param  {String} config.key                name of the item inside this bucket
   * @param  {String} config.path               path of the file
   * @param  {String} config.ACL                ACl of the key inside the bucket
   * @param  {requestCallback} callback         The callback that handles the response.
   * more about the return type in callback
   * {@link http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteBucket-property}
   */
  uploadInS3(config) {
    return this.s3
      .upload({
        Bucket: config.bucket,
        Key: config.key,
        Body: require('fs').createReadStream(config.path),
        // ACL: 'public-read',
      })
      .promise();
  }
}

module.exports = function (config) {
  return new S3Util(config);
};
