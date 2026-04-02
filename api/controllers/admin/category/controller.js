'use strict';
/**
 * This Controller handles all functionality of admin category
 * @module Controllers/Admin/category
 */
module.exports = function(app) {

  /**
   * category module
   * @type {Object}
   */
  const category = app.module.category;

  /**
   * Adds a category
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const addCategory = (req, res, next) => {
    category.create(req.body)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Fetches a category
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const getCategory = (req, res, next) => {
    category.get(req.params.categoryId)
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
  const getCategoryList = (req, res, next) => {
    let query = {
      skip: Number(req.query.skip) || app.config.page.defaultSkip,
      limit: Number(req.query.limit) || app.config.page.defaultLimit,
      filters: {},
      sort: {}
    };

    if (req.body.filters) {
      let { name, categoryType } = req.body.filters;
      if (name) {
        query.filters.name = new RegExp(`^${name}`, 'ig');
      }
      if (categoryType) {
        query.filters.categoryType = Number(categoryType);
      }
    }
    if (req.body.sortConfig) {
      let { name } = req.body.sortConfig;
      if (name) {
        query.sort.name = name;
      }
    }

    category.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Edits a category
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const editCategory = (req, res, next) => {
    req.categoryId.name = req.body.name;
    req.categoryId.colorCode = req.body.colorCode;
    req.categoryId.categoryType = req.body.categoryType;
    category.edit(req.categoryId)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  /**
   * Deletes a category
   * @param  {Object}   req  Request 
   * @param  {Object}   res  Response
   * @param  {Function} next Next is used to pass control to the next middleware function
   * @return {Promise}       The Promise
   */
  const deleteCategory = (req, res, next) => {
    category.remove(req.categoryId)
      .then(output => {
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    add: addCategory,
    get: getCategory,
    edit: editCategory,
    list: getCategoryList,
    delete: deleteCategory
  };

};