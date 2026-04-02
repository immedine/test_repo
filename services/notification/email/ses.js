'use strict';

module.exports = function (app) {
  /**
   * Requiring AWS module
   */
  const aws = require('aws-sdk');

  /**
   * Setting the config data
   */
  aws.config.update(app.config.aws.ses);

  /**
   * Creating a new instance of AWS SES
   */
  const ses = new aws.SES({
    apiVersion: '2010-12-01',
  });

  const sesEmail = function (options) {
    return new Promise((resolve, reject) =>
      ses.sendEmail(
        {
          Source: `${app.config.server.systemEmail.name} <${app.config.server.systemEmail.email}>`,
          Destination: {
            ToAddresses: [options.to],
          },
          Message: {
            Subject: {
              Data: options.subject,
            },
            Body: {
              Html: {
                Data: options.renderedOutput,
              },
            },
          },
        },
        (error, result) => (error ? reject(error) : resolve(result))
      )
    );
  };

  const sesRawEmail = function (options) {
    var params = {
      Destinations: [...options.to],
      RawMessage: {
        Data: options.data,
      },
      Source: `${app.config.server.systemEmail.name} <${app.config.server.systemEmail.email}>`,
    };

    return new Promise((resolve, reject) =>
      ses.sendRawEmail(params, (error, result) => (error ? reject(error) : resolve(result)))
    );
  };

  return {
    sesEmail,
    sesRawEmail,
  };
};
