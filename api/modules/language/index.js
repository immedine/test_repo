'use strict';

/**
 * This module handles all functionality of Admin Language
 * @module Modules/Language
 */
module.exports = function (app) {


  /**
   * language Model
   * @type {Mongoose.Model}
   */
  const Language = app.models.Language;

  /**
   * Creates a Language
   * @param  {Object} config  The config object
   * @return {Promise}        The promise
   */
  const createLanguage = function (config) {
    return Language.createLanguage(config.name, config.code);
  };

  /**
   * Fetches a language by Id
   * @param  {String} languageId  The language id
   * @return {Promise}        The promise
   */
  const findLanguageById = function (languageId) {
    return Language.findById(languageId);
  };

  /**
   * Edits a language
   * @param  {Object} editedLanguage The edited language document
   * @return {Promise}           The promise
   */
  const editLanguage = function (editedLanguage) {
    return Language.countDocuments({
      code: editedLanguage.code,
      _id: {
        $ne: editedLanguage._id
      }
    })
      .then(count => count ? Promise.reject({
        'errCode': 'LANGUAGE_ALREADY_EXISTS'
      }) : editedLanguage.save());
  };

  /**
   * Fetches a list of languages
   * @param  {Object} options  The options object
   * @return {Promise}        The promise
   */
  const getList = function (options) {
    return Language.pagedFind(options);
  };

  /**
   * Removes a language
   * @param  {Object} language The language document
   * @return {Promise}     The promise
   */
  const removeLanguage = function (language) {
    return Language.removeLanguage(language._id);
  };

  const updatePreference = (languageCode, userDoc) => {
    userDoc.preferredLanguage = languageCode; 
      return userDoc.save().then((usrDoc) => {
        return usrDoc;
      })
  };

  return {
    'create': createLanguage,
    'get': findLanguageById,
    'edit': editLanguage,
    'list': getList,
    'remove': removeLanguage,
    'updatePreference': updatePreference
  };
};