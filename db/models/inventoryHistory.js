'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true
    },

    inventoryRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
      index: true
    },

    locationRef: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    isDebited: Boolean,

    quantity: {
      type: Number,
      default: 0
    },

    prevLocQuantity: {
      type: Number,
      default: 0
    },

    prevTotalQuantity: {
      type: Number,
      default: 0
    },

    reason: String,

    reOrderCount: {
      type: Number,
      default: 1
    },

    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },

    requisitionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requisition"
    },

    expenseRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense"
    },

    userRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantOwner"
    },

    menuRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu"
    },

    userName: String
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
  schema.statics.createInventoryHistory = function (data) {
    return (new this(data)).save();

  };

  return schema;
};