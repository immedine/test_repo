'use strict';

module.exports = function (app, mongoose /*, plugins*/) {
  const globalConfigSchema = new mongoose.Schema(
    {
      supportContactNo: {
        countryCode: { type: String },
        number: { type: String },
      },
      supportEmail: String,
      appleStoreLink: String,
      playStoreLink: String,
      privacyPolicy: String,
      termsAndConditions: String,
      donate: {
        title: String,
        description: String,
        link: String,
        images: [{
          type: String
        }]
      }
    },
    {
      versionKey: false,
      timestamps: true,
    }
  );

  /**
   * Gets a configuration based on key array
   * @param  {String}  keyArray   The configuration key array
   * @return {Promise}            The promise
   */
  globalConfigSchema.statics.getSelectedKey = function (keyArray) {
    let keySelectionObj = {};
    if (keyArray && Array.isArray(keyArray) && keyArray.length > 0) {
      keyArray.forEach((value) => {
        keySelectionObj[value] = 1;
      });
    } else {
      keySelectionObj = {
        _id: 0,
        updatedAt: 0,
        createdAt: 0,
      };
    }

    return this.findOne().select(keySelectionObj).exec();
  };

  return globalConfigSchema;
};
