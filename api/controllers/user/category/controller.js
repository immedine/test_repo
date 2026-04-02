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
      filters: {
        status: app.config.contentManagement.category.active,
        restaurantRef: req.body.filters.restaurantRef
      },
      sort: {order: 1}
    };

    if (req.body.filters) {
      let { categoryIds } = req.body.filters;
      if (categoryIds) {
        query.filters._id = {
          $in: categoryIds
        }
      }
    }

    category.list(query)
      .then(output => {
        req.workflow.outcome.data = output;
        req.workflow.emit('response');
      })
      .catch(next);
  };

  return {
    list: getCategoryList,
  };

};