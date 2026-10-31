'use strict';

module.exports = function (app, mongoose) {
  const InventoryOperationSchema = new mongoose.Schema(
    {
      restaurantRef: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      orderRef: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      cart: [{
        name: String,
        quantity: Number,
        price: Number,
        isNewToCart: {
          type: Boolean,
          default: false
        },
        dateTime: {
          type: Date,
          default: Date.now
        },
        served: {
          type: Boolean,
          default: false
        },
        menuRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Menu'
        },
        excludeGST: {
          type: Boolean,
          default: false
        },
        excludeServiceCharge: {
          type: Boolean,
          default: false
        },
        subItems: [{
          name: String,
          quantity: Number,
          price: Number,
          served: {
            type: Boolean,
            default: false
          },
        }]
      }],
      oldCart: [{
        name: String,
        quantity: Number,
        price: Number,
        isNewToCart: {
          type: Boolean,
          default: false
        },
        dateTime: {
          type: Date,
          default: Date.now
        },
        served: {
          type: Boolean,
          default: false
        },
        menuRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Menu'
        },
        excludeGST: {
          type: Boolean,
          default: false
        },
        excludeServiceCharge: {
          type: Boolean,
          default: false
        },
        subItems: [{
          name: String,
          quantity: Number,
          price: Number,
          served: {
            type: Boolean,
            default: false
          },
        }]
      }],
      operationType: {
        type: String,
        required: true
      },
      status: {
        type: Number,
        default: app.config.contentManagement.inventoryOperation.active
      }
    },
    {
      timestamps: true,
    }
  );


  /**
   * this function is to create a new KOT
   * @param  {Object} data  KOT data
   * @return {Promise}
   */
  InventoryOperationSchema.statics.createInventoryOperation = function (data) {
    return (new this(data)).save();
  };

  return InventoryOperationSchema;
};