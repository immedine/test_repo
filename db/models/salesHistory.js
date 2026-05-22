'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    images: {
      type: [String],
      default: []
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
    status: {
      type: Number,
      default: app.config.contentManagement.salesHistory.active
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  }, {
    versionKey: false,
    timestamps: true,
  });

  schema.index({ location: '2dsphere' });

  
  /**
   * this function is to add new sales history
   * @param  {String} name   name of the sales history
   * @param  {String} description description of the sales history
   * @return {Promise}
   */
  schema.statics.createSalesHistory = function (data) {
    return new this(data).save();
  };

  return schema;
};