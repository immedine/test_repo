'use strict';
/**
 * This Controller handles all functionality of admin faq
 * @module Controllers/Admin/faq
 */
module.exports = function(app) {

  /**
   * faq module
   * @type {Object}
   */
  const faq = app.module.faq;

  /**
   * Adds a faq
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addFAQ = (req, res, next) => {
    faq.create(req.body)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a faq
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getFAQ = (req, res, next) => {
    faq.get(req.params.faqId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of categories
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getFAQList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {},
      sort: {}
    };

    if (req.body.filters) {
      let { question } = req.body.filters;
      if (question) {
        query.filters.question = new RegExp(`^${question}`, 'ig');
      }
    }

    faq.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a faq
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editFAQ = (req, res, next) => {
    req.faqId.question = req.body.question;
    req.faqId.answer = req.body.answer;
    faq.edit(req.faqId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a faq
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteFAQ = (req, res, next) => {
    faq.remove(req.faqId)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addFAQ,
    get: getFAQ,
    edit: editFAQ,
    list: getFAQList,
    delete: deleteFAQ
  };

};