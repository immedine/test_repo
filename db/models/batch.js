'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    inventoryRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expenseRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense'
    },
    batchNo: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    status: {
      type: Number,
      default: app.config.contentManagement.batch.active
    }
  }, {
    versionKey: false,
    timestamps: true,
  });

  schema.index({ inventoryRef: 1, batchNo: 1 }, { unique: true });

  /**
   * this function is to add new batch
   * @param  {String} inventoryRef  inventory reference
   * @param  {String} batchNo       batch number
   * @return {Promise}
   */
  schema.statics.createBatch = function (data) {
    return new this(data).save();
  };

  return schema;
};