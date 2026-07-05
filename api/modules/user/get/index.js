'use strict';

module.exports = function (app) {
  const User = app.models.User;

  const getAll = async (options) => {
    const pipeline = [
      {
        $match: options.filters
      },
      {
        $addFields: {
          restaurantVisit: {
            $first: {
              $filter: {
                input: "$restaurantWiseVisits",
                as: "visit",
                cond: {
                  $eq: ["$$visit.restaurantRef", options.restaurantRef]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          personalInfo: 1,
          accountStatus: 1,
          createdAt: 1,
          restaurantVisit: 1
        }
      },
      {
        $sort: options.sort
      },
      {
        $skip: Number(options.skip) || app.config.page.defaultSkip
      },
      {
        $limit: Number(options.limit) || app.config.page.defaultLimit
      }
    ];

    return await User.aggregate(pipeline);
  };

  return { getAll };
};
