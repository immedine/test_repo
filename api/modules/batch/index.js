'use strict';

/**
 * This module handles all functionality of Admin Batch
 * @module Modules/Batch
 */
module.exports = function (app) {


  /**
   * batch Model
   * @type {Mongoose.Model}
   */
  const Batch = app.models.Batch;

  /**
   * Creates a Batch
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createBatch = function (config, userRef) {
    config.restaurantRef = userRef.restaurantRef;
    config.createdBy = userRef._id;
    return Batch.createBatch(config);
  };

  const updateBatchWithPurchase = async (payload, purchaseId, isDeduct, userData) => {
    try {
      const bulkOps = [];
      const batchNo = `BATCH_${Date.now()}`;

      for (const item of payload) {
        const totalQuantity = item.locationList.reduce((sum, loc) => sum + (loc.quantity || 0), 0);

        if (isDeduct) {
          // make the status of the batch inactive for the purchaseId
          bulkOps.push({
            updateMany: {
              filter: { expenseRef: purchaseId },
              update: { $set: { status: app.config.contentManagement.batch.inactive } } }
            });
          
        } else {
          // Create new batch or update existing
          bulkOps.push({
            insertOne: {
              document: {
                inventoryRef: item.itemRef,
                restaurantRef: userData.restaurantRef,
                createdBy: userData._id,
                expenseRef: purchaseId,
                batchNo: batchNo,
                price: item.amount / item.quantity,
                quantity: item.quantity,
                status: app.config.contentManagement.batch.active
              }
            }
          });
        }
      }

      if (bulkOps.length > 0) {
        await Batch.bulkWrite(bulkOps);
      }

      return { success: true, message: "Batch updated successfully" };

    } catch (err) {
      console.error(err);
      throw err;
    }
  };


  return {
    'create': createBatch,
    'updateBatchWithPurchase': updateBatchWithPurchase
  };
};