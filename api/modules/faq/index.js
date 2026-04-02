'use strict';

/**
 * This module handles all functionality of Admin FAQ
 * @module Modules/FAQ
 */
module.exports = function (app) {


  /**
   * faq Model
   * @type {Mongoose.Model}
   */
  const FAQ = app.models.FAQ;

  /**
   * Creates a FAQ
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createFAQ = function (config) {
    return FAQ.createFAQ(config);
  };

  /**
   * Fetches a faq by Id
   * @param  {String} faqId  The faq id
   * @return {Promise}        The promise
   */
  const findFAQById = function (faqId) {
    return FAQ.findById(faqId);
  };

  /**
   * Edits a faq
   * @param  {Object} editedFAQ The edited faq document
   * @return {Promise}           The promise
   */
  const editFAQ = function (editedFAQ) {
    return FAQ.countDocuments({
      question: editedFAQ.question,
      _id: {
        $ne: editedFAQ._id
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'FAQ_ALREADY_EXISTS'
      }) : editedFAQ.save());
  };

  /**
   * Fetches a list of faqs
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return FAQ.pagedFind(options);
  };

  /**
   * Removes a faq
   * @param  {Object} faq The faq document
   * @return {Promise}     The promise
   */
  const removeFAQ = function (faq) {
    return FAQ.removeFAQ(faq._id);
  };

  return {
    'create': createFAQ,
    'get': findFAQById,
    'edit': editFAQ,
    'list': getList,
    'remove': removeFAQ
  };
};