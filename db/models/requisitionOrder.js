'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    requisitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Requisition',
      required: true
    },
    requestedByRestaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    requestedToRestaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOwner',
      required: true
    },
    status: {
      type: Number,
      default: app.config.contentManagement.requisitionOrderStatus.active
    },
    currentLocation: {
      type: { type: String, default: 'Point' },
      coordinates: [Number], // [longitude, latitude]
    },
    history: [{
      status: Number,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RestaurantOwner',
      },
      dateTime: {
        type: Date,
        default: Date.now
      },
      remarks: String,
      comments: String
    }],

  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new order
   * @param  {String} name          name of the order
   * @param  {String} colorCode     colorCode of the order
   * @param  {String} orderType  orderType of the order
   * @return {Promise}            
   */
  schema.statics.createRequisitionOrder = function (data) {
    return (new this(data)).save();
  };


  /**
   * this function is to remove order 
   * @param  {string} _id order id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeRequisitionOrder = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};