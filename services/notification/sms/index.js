'use strict';

class SNS {
  constructor(config) {
    this.aws = require('aws-sdk');
    this.sns = new this.aws.SNS(config);
  }

  send(sentTo, body = '') {
    return this.sns.publish({ Message: body, MessageStructure: 'string', PhoneNumber: sentTo }).promise();
  }
}

module.exports = function () {
  return {
    sns: SNS,
  };
};
