'use strict';

module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    kotNo: {
      type: String,
      required: true
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    restaurantRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    items: [{
      menuRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu'
      },
      menuName: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      operation: {
        type: String,
        enum: ['add', 'remove', 'update'],
        default: 'add'
      },
      subItems: [{
        name: String,
        quantity: Number,
        price: Number,
        operation: {
          type: String,
          enum: ['add', 'remove', 'update'],
          default: 'add'
        },
      }]
    }]
  }, {
    versionKey: false,
    timestamps: true
  });


  /**
   * this function is to create a new KOT
   * @param  {Object} data  KOT data
   * @return {Promise}
   */
  schema.statics.createKOT = function (data) {
    return (new this(data)).save();
  };


  /**
   * this function is to remove KOT
   * @param  {string} _id KOT id
   * @return {Promise}    Promise Object
   */
  schema.statics.removeKOT = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};