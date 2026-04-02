'use strict';


var apn = require('apn');
var fs = require('fs');
var admin = require('firebase-admin');
// var serviceAccount = require('./service-account.json'); 

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });
/**
 * This function is responsible of push notification
 * @constructor
 */
function PushNotification() { }

/**
 * This function  send a message to the iOS users 
 * https://eladnava.com/send-push-notifications-to-ios-devices-using-xcode-8-and-swift-3/
 * @this {PushNotification}
 * @param {object} config                      config object
 * @param {Array}  config.devices              array of the devices
 * @param {String} config.p8File               path of the p12 File
 * @param {String} config.keyId                pass phrase of the key
 * @param {Object} config.teamId               message that needs to be send
 * @param {Object} config.bundleId             bundle Id of the app
 * @param {Number} [config.expireInSec=3600]   how much time the message will be in cache in APNS server
 * @param {Object} config.message              payload of the notification
 * @param {String} config.message.alert        summary of notification
 * @param {String} config.isProduction         set the environment as sandbox or production
 * @param {String} [config.sound]              sound when the notification receive
 * @param {String} [config.badge]              display badge when the notification receive
 */
PushNotification.prototype.sendAPN = config => {
  var apnProvider = new apn.Provider({
    token: {
      key: fs.readFileSync(config.p8File),
      keyId: config.keyId,
      teamId: config.teamId,
    },
    production: config.isProduction,
  });

  var notification = new apn.Notification();
  notification.topic = config.bundleId;
  notification.expiry = Math.floor(Date.now() / 1000) + (config.expireInSec || 3600);
  notification.payload = config.message;
  notification.alert = config.message.alert;
  notification.badge = 0;

  if (config.sound) {
    notification.sound = config.sound;
  }
  return Promise.all(config.devices.map(each => apnProvider.send(notification, each)));

};

PushNotification.prototype.sendFCM = config => {
  return new Promise((resolve, reject) => {
    const message = {
      token: config.notificationKey,
      notification: {
        title: config.title,
        body: config.body,
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };
    
    // if (config.optionalData) {
    //   message.data = config.optionalData;
    // }

    admin.messaging().send(message)
      .then((response) => {
        console.log('Successfully sent message:', response);
        resolve(response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
        reject(error);
      });
  });
};


module.exports = function (app) {

  /**
   * Creating a new instance of PushNotification
   * @type {PushNotification}
   */
  return new PushNotification();

};