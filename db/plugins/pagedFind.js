'use strict';

/**
 * paged Find plugin attach a statics into your schema with the name pagedFind
 * @module schema/plugins/paged-find-plugin
 */

module.exports = function (/*app*/) {
  return function pagedFindPlugin(schema) {
    /**
     * Finds list of documents from a given schema
     * @param  {object}           options           options to find the object
     * @param  {Number}           options.limit     the total number of objects that is max can be returned
     * @param  {Number}           options.skip      the total number of objects that should skip
     * @param  {String}           options.keys      the keys that should be selected
     * @param  {object}           options.filters   query for finding result
     * @param  {object}           options.sort      sort object for finding result
     * @param  {requestCallback}  cb                callback to be executed after the find operation
     *
     * @memberof module:paged-Find-plugin
     *
     * @this schema
     *
     * @example
     * var A = mongoose.models('a' , new mongosoe.Schema({
     *    x : {
     *      type : String,
     *      match : /a/,
     *      required : true
     *    }
     * }));
     *
     * A.plugin('path to page find plugin');
     *
     *
     * A.pagedFind({},function (err,result) {
     *  console.log(err,result); // iff validation failed
     * });
     *
     */
    let pagedFind = function (options, cb) {
      if (!options.filters) {
        options.filters = {};
      }

      if (!options.keys) {
        options.keys = '';
      }

      if (options.limit === undefined || options.limit === null) {
        options.limit = 10;
      }

      if (!options.skip) {
        options.skip = 0;
      }

      if (!options.sort) {
        options.sort = {};
      }

      options.skip = Number(options.skip);
      options.limit = Number(options.limit);

      let output = {
        data: null,
        skip: Number(options.skip),
        limit: Number(options.limit),
        total: 0,
      };

      let countResults = () => {
        return this.countDocuments(options.filters)
          .then((count) => {
            output.total = count;
            if (options.limit === 0) {
              output.skip = 0;
              output.limit = output.total;
            }
            return Promise.resolve();
          })
          .catch(Promise.reject);
      };

      let getResults = () => {
        try {
          let query = this.find(options.filters, options.keys);

          if (options.limit !== 0) {
            query.skip(options.skip);
            query.limit(options.limit);
          }

          query.collation({ locale: 'en' });

          query.sort(options.sort);

          if (options.populate) {
            if (!Array.isArray(options.populate)) {
              options.populate = [options.populate];
            }
            options.populate.forEach((each) => {
              query.populate(each);
            });
          }

          if (options.lean) {
            query.lean();
          }

          return query
            .exec()
            .then((results) => {
              output.data = results;
              return Promise.resolve();
            })
            .catch(Promise.reject);
        } catch (err) {
          return Promise.reject(err);
        }
      };

      return Promise.all([countResults(), getResults()])
        .then(() => cb(null, output))
        .catch((err) => cb(err, null));
    };

    schema.statics.pagedFindCB = pagedFind;

    schema.statics.pagedFind = function (options) {
      return new Promise((resolve, reject) => {
        pagedFind.apply(this, [options, (error, data) => (error ? reject(error) : resolve(data))]);
      });
    };
  };
};
