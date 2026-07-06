'use strict';

module.exports = function (app) {
  const User = app.models.User;

  const getAll = async (options) => {
    const skip = options.skip;
    const limit = options.limit;
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
        $facet: {
          data: [
            { $sort: options.sort },
            { $skip: skip },
            { $limit: limit }
          ],
          total: [
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await User.aggregate(pipeline);

    return {
      data: result[0].data,
      skip,
      limit,
      total: result[0].total.length ? result[0].total[0].count : 0
    };
  };

  return { getAll };
};
