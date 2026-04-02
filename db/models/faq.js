'use strict';
module.exports = function(app, mongoose) {
  const schema = new mongoose.Schema({
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    status: {
      type: Number,
      default: app.config.contentManagement.faq.active
    }
  }, {
    versionKey: false,
    timestamps: true,
  });

  /**
   * this function is to add new faq
   * @param  {String} question   question of the faq
   * @param  {String} answer     answer of the faq
   * @return {Promise}            
   */
  schema.statics.createFAQ = function (data) {
    const { question } = data;
    return this.exist(question)
      .then((doc) => doc ? Promise.reject({
        'errCode': 'FAQ_ALREADY_EXISTS'
      }) : (new this(data)).save());

  };
  /**
   * this is to check if any faq exists with the question
   * @param  {String} question question of the faq
   * @return {Promise}
   */
  schema.statics.exist = function (question) {
    return this.countDocuments({
      question: question
    }).exec();
  };


  /**
   * this function is to remove faq 
   * @param  {string} _id faq id
   * @return {Promise}    Promise Object 
   */
  schema.statics.removeFAQ = function (_id) {
    return this.findByIdAndRemove(_id).exec();
  };
  return schema;
};