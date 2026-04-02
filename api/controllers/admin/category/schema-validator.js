'use strict';

module.exports = function(app) {
  const addCategory = {
    'name': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'colorCode': {
      type: 'string',
      allowEmpty: false,
      required: true
    }
  };

  const listQuery = {
    'skip': {
      type: 'string',
      'conform': function(value) {
        return app.utility.isValidate.isNumber(value);
      }
    },
    'limit': {
      type: 'string',
      'conform': function(value) {
        return app.utility.isValidate.isNumber(value);
      }
    }
  };

  const param = {
    'categoryId': {
      type: 'string',
      required: true,
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    }
  };

  const list = {
    'sortConfig': {
      type: 'object',
      properties: {
        'name': {
          type: 'number',
          enum: [1, -1]
        }
      }
    },
    'filters': {
      type: 'object',
      properties: {
        'name': {
          type: 'string',
          allowEmpty: false
        },
        'moduleName': {
          type: 'string',
          allowEmpty: false
        },
      }
    }
  };

  return {
    add: addCategory,
    edit: addCategory,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};