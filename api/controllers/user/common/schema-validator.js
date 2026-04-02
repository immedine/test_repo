'use strict';

module.exports = function (app) {
  const image = {
    image: {
      type: 'object',
    },
  };

  const searchCityStory = {
    'filters': {
      type: 'object',
      properties: {
        'searchText': {
          type: 'string',
          allowEmpty: false
        }
      }
    }
  };

  return { image, searchCityStory };
};
