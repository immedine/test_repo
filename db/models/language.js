'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    code: {
      type: String,
      default: '',
      required: true
    },
    status: {
      type: Number,
      default: app.config.contentManagement.language.active
    }
  }, {
    versionKey: false,
    timestamps: true,
  });

  /**
   * this function is to add new language
   * @param  {String} name  name of the language
   * @param  {String} code  code of the language
   * @return {Promise}            
   */
  schema.statics.createLanguage = function (name, code) {
    return this.exist(code)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'LANGUAGE_ALREADY_EXISTS'
      }) : (new this({
        name: name,
        code: code,
      })).save());

  };
  /**
   * this is to check if any language exists with the name
   * @param  {String} name name of the language
   * @return {Promise}
   */
  schema.statics.exist = function (code) {
    return this.countDocuments({
      code: code
    }).exec();
  };


  /**
   * this function is to remove language 
   * @param  {string} _id language id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeLanguage = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };


  return schema;
};