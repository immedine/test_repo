'use strict';

module.exports = function(app) {


  const bulkUploadCron = require('./scripts/bulkUploadCron');
  const bulkUploadRestaurantCron = require('./scripts/bulkUploadRestaurantCron');
  const bulkUploadFfromJsonCron = require('./scripts/bulkUploadFromJson');
  const fetchS3URLCron = require('./scripts/fetchS3URLCron');
  const cleanImage = require('./scripts/cleanImage');
  const removeNotification = require('./scripts/removeNotification');


  function executeCron() {
    // bulkUploadCron(app);
    bulkUploadRestaurantCron(app);
    // bulkUploadFfromJsonCron(app);
    // fetchS3URLCron(app);
    // cleanImage(app);
    removeNotification(app);
  }
  return executeCron;
};