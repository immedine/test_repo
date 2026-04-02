'use strict';

module.exports = function (app) {
  const User = app.models.User;

  return (id) => {
    return User.findById(id).then((userDoc) =>
      userDoc
        ? Promise.resolve({
          personalInfo: userDoc.personalInfo,
          accountStatus: userDoc.accountStatus,
          _id: userDoc._id
        })
        : Promise.reject({ errCode: 'USER_NOT_FOUND' })
    );
  };
};
