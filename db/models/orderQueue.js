// models/orderQueue.model.js

'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    deviceId: {
      type: String,
      required: true,
      index: true,
    },

    operation: {
      type: String,
      enum: ["CREATE", "UPDATE"],
      required: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SYNCED", "FAILED"],
      default: "PENDING",
      index: true,
    },

    retryCount: {
      type: Number,
      default: 0,
    },

    processingAt: {
      type: Date,
      default: null,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: null,
    },

    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  });


  return schema;
};