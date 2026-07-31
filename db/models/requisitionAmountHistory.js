'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    requisitionOrderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RequisitionOrder",
    },
    requisitionRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requisition",
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    masterRestaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantOwner",
    },
    amount: {
      type: Number,
      required: true
    },
    isDebited: {
      type: Boolean
    },
    historyType: {
      type: Number
    }
  }, {
    versionKey: false,
    timestamps: true,
  });

  /**
   * this function is to add new history
   * @param  {String} question   question of the history
   * @param  {String} answer     answer of the history
   * @return {Promise}            
   */
  schema.statics.createRequisitionAmountHistory = function (data) {
    return (new this(data)).save();
  };

  return schema;
};