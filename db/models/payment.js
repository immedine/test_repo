'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    orderId: {
      type: String,
      required: true,
      index: true
    },

    razorpayOrderId: {
      type: String,
      required: true,
      index: true
    },

    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },

    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    razorpayPaymentId: {
      type: String,
      required: true,
      unique: true, // ⚠️ prevents duplicate webhook insert
      index: true
    },

    // 💰 Amount
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: "INR"
    },

    // 📊 Payment status
    status: {
      type: Number,
      enum: Object.values(app.config.contentManagement.subscriptionPaymentStatus),
      default: app.config.contentManagement.subscriptionPaymentStatus.created,
      index: true
    },

    // 💳 Payment method
    method: String, // card, upi, netbanking
    bank: String,
    wallet: String,
    vpa: String, // for UPI

    // 🔐 Verification
    signature: String,

    // 📦 Full Razorpay response (VERY IMPORTANT)
    rawResponse: {
      type: Object
    },

    // 🔔 Webhook tracking
    webhookReceived: {
      type: Boolean,
      default: false
    },

    webhookEventId: String,

    // ⏱ timestamps
    capturedAt: Date,
    failedAt: Date
  }, {
    versionKey: false,
    timestamps: true,
  });


  return schema;
};