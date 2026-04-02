'use strict';
/**
 * This Controller handles all functionality of admin language
 * @module Controllers/Admin/language
 */
module.exports = function(app) {

  /**
   * language module
   * @type {Object}
   */
  const language = app.module.language;

  /**
   * Fetches a language
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getLanguage = (req, res, next) => {
    language.get(req.params.languageId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a list of languages
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getLanguageList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {},
      sort: {}
    };

    if (req.body.filters) {
      let { name, moduleName } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
    }
    if (req.body.sortConfig) {
      let { name } = req.body.sortConfig;
      if (name) {
        query.sort.name = name;
      }
    }

    language.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  const updateLanguagePreference = (req, res, next) => {
    language.updatePreference(req.params.languageCode, req.session.user)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    get: getLanguage,
    list: getLanguageList,
    updateLanguagePreference: updateLanguagePreference
  };

};