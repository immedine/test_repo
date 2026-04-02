'use strict';

module.exports = function(app) {
  const addFAQ = {
    'question': {
      type: 'string',
      allowEmpty: false,
      required: true
    },
    'answer': {
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
    'faqId': {
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
    add: addFAQ,
    edit: addFAQ,
    listQuery: listQuery,
    param: param,
    list: list,
  };

};