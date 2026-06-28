'use strict';
module.exports = function (app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String
    },
    status: {
      type: Number,
      default: app.config.contentManagement.tempRestaurant.active
    },
    phone: {
      countryCode: { type: String, default: 'IN' },
      number: { type: String },
      isLandline: { type: Boolean, default: false }
    }
  }, {
    versionKey: false,
    timestamps: true,
  });


  /**
   * this function is to add new restaurant
   * @param  {String} name          name of the restaurant
   * @return {Promise}            
   */
  schema.statics.createRestaurant = function (data) {
    const { name } = data;
    return this.exist(name)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'RESTAURANT_ALREADY_EXISTS'
      }) : (new this(data)).save());

  };
  /**
   * this is to check if any restaurant exists with the name
   * @param  {String} name name of the restaurant
   * @return {Promise}
   */
  schema.statics.exist = function (name) {
    return this.countDocuments({
      name: name,
      status: app.config.contentManagement.tempRestaurant.active
    }).exec();
  };


  /**
   * this function is to remove restaurant 
   * @param  {string} _id restaurant id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeRestaurant = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };

  return schema;
};