'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    deviceId: {
      type: String,
      required: true
    },
    deviceType: {
      type: String,
      required: true
    },
    otp: {
      type: String
    },
    tableRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table'
    },
    refNo: {
      type: String
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    expiryTime: {
      type: Date,
    },
    attempt: {
      type: Number,
      default: 0
    } // max: 3
  }, {
    versionKey: false,
    timestamps: true,
  });


  schema.statics.createOTP = function (data) {
    return new this(data).save();
  };

  schema.statics.removeOTP = function (data) {
    return this.findOneAndDelete(data).exec();
  };


  return schema;
};