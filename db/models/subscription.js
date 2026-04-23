'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    planRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      // required: true
    },

    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },

    // 🔗 Razorpay order id
    razorpayOrderId: {
      type: String
    },
    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    amount: {
      type: Number,
      required: true,
      default: 0
    },
    currency: {
      type: String,
      default: "INR"
    },
    status: {
      type: Number,
      enum: Object.values(app.config.contentManagement.subscriptionStatus),
      default: app.config.contentManagement.subscriptionStatus.created,
    },
    paymentId: {
      type: String
    },

    // 🧾 Receipt (what you send to Razorpay)
    receipt: {
      type: String
    },
    // For tracking changes in subscription
    upcomingRazorpayOrderId: String,
    upcomingStatus: Number,
    upcomingAmount: Number,
    upcomingPlanRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
    },
    upcomingUserRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  return schema;
};