'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    reqId: {
      type: String,
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
    type: {
      type: Number,
      default: app.config.contentManagement.requisitionType.inventory
    },
    priority: {
      type: Number,
      default: app.config.contentManagement.requisitionPriority.low
    },
    remarks: {
      type: String
    },
    status: {
      type: Number,
      default: app.config.contentManagement.requisitionStatus.active
    },
    cart: [{
      name: String,
      requestedQuantity: Number,
      approvedQuantity: Number,
      pricePerItem: Number,
      unit: {
        type: Number
      },
      saveAsUnit: {
        type: Number
      },
      inventoryRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Inventory'
      },
      justification: String
    }],
    subTotal: {
      type: Number,
      required: true,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    },
    deliveryAddress: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      country: {
        type: String,
        default: 'IN'
      },
      postalCode: String,
      location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number], // [longitude, latitude]
      },
    },
    expectedDeliveryDate: {
      type: Date
    },
    deliveryInstructions: String,
    contactDetails: {
      name: String,
      phone: String,
      email: String
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
  schema.statics.createRequisition = function (data) {
    return (new this(data)).save();
  };


  /**
   * this function is to remove order 
   * @param  {string} _id order id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeRequisition = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};