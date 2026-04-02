'use strict';

module.exports = function (app) {


  const createNotification = {
    message: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
    notificationType: {
      type: 'string',
      required: true,
      allowEmpty: false,
    },
    redirectionId: {
      type: 'string',
      'conform': function(value) {
        return app.utility.checkMongooseObjectId(value);
      }
    },
  };

  return {
    createNotification: createNotification,
  };
};
