'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    name_lower: {
      type: String,
      lowercase: true
    },
    preCode: {
      type: String
    },
    code: {
      type: String
    },
    status: {
      type: Number,
      default: app.config.contentManagement.inventory.active
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantOwner'
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    image: {
      type: String
    },
    quantity: {
      type: Number,
      default: 0
    },
    unit: {
      type: Number
    },
    saveAsUnit: {
      type: Number
    },
    inAppDisplayable: {
      type: Boolean,
      default: false
    },
    locationList: [{
      location: {
        type: mongoose.Schema.Types.ObjectId,
      },
      avgRate: {
        type: Number,
        default: 0
      }, // rate by lowest unit
      quantity: {
        type: Number,
        default: 0
      },
      threshold: {
        type: Number,
        default: 0
      },
      thresholdUnit: {
        type: Number,
        default: 0
      },
      thresholdSaveAsUnit: {
        type: Number,
        default: 0
      },
      history: [{
        prevLocQuantity: {
          type: Number,
          default: 0
        },
        reOrderCount: {
          type: Number,
          default: 1
        },
        prevTotalQuantity: {
          type: Number,
          default: 0
        },
        quantity: {
          type: Number,
          default: 0
        },
        isDebited: {
          type: Boolean
        },
        date: {
          type: Date,
          default: Date.now
        },
        reason: {
          type: String
        },
        orderRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order',
        },
        requisitionRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Requisition',
        },
        expenseRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Expense',
        },
        userRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RestaurantOwner',
        },
        userName: {
          type: String
        }
      }]
    }],
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new inventory
   * @param  {String} name          name of the inventory
   * @param  {String} colorCode     colorCode of the inventory
   * @param  {String} inventoryType  inventoryType of the inventory
   * @return {Promise}            
   */
  schema.statics.createInventory = function (data) {
    const { name, restaurantRef } = data;
    data.name_lower = name.toLowerCase();
    return this.exist(data.name_lower, restaurantRef)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'INVENTORY_ALREADY_EXISTS'
      }) : (new this(data)).save());

  };
  /**
   * this is to check if any inventory exists with the name
   * @param  {String} name name of the inventory
   * @return {Promise}
   */
  schema.statics.exist = function (name_lower, restaurantRef) {
    return this.countDocuments({
      name_lower: name_lower,
      status: app.config.contentManagement.inventory.active,
      restaurantRef: restaurantRef
    }).exec();
  };


  /**
   * this function is to remove inventory 
   * @param  {string} _id inventory id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeInventory = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};