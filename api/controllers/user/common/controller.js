'use strict';
/**
 * This Controller handles all functionality of admin common routes
 * @module Controllers/Admin/Common
 */
module.exports = (app) => {

  const city = app.module.city;
  const story = app.module.story;

  const uploadImage = (req, res, next) => {
    req.workflow.outcome.data = req.files.image.getPath;
    req.workflow.emit('response');
  };
  
  const searchCityStory = (req, res, next) => {
    let queryForCity = {
      skip: 0,
      limit: 0,
      filters: {},
      sort: {},
      keys: 'name'
    };

    let queryForStory = {
      skip: 0,
      limit: 0,
      filters: {},
      sort: {},
      keys: 'languageDetails uniqueId',
       populate: [{
        'path': 'languageDetails.languageRef',
        'select': 'name'
      }]
    };

    if (req.body.filters) {
      let { searchText } = req.body.filters;
      if (searchText) {
        queryForCity.filters.name = new RegExp(`^${searchText}`, 'ig');
        Object.assign(queryForStory.filters, {
        $or: [
            {
              uniqueId: new RegExp(`^${searchText}`, 'ig')
            },
            {
              "languageDetails.name": new RegExp(`^${searchText}`, 'ig')
            }
          ]
        })
      }
    }

    return Promise.all([
      city.list(queryForCity),
      story.list(queryForStory)
    ])
    .spread((cityList, storyList) => {
        req.workflow.outcome.data = {
          cityList: cityList.data,
          storyList: storyList.data
        };
        req.workflow.emit('response');
    })
  };

  return { uploadImage, searchCityStory };
};
