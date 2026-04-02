'use strict';

module.exports = function (app) {
  const image = {
    image: {
      type: 'object',
    },
  };

  const audio = {
    audio: {
      type: 'object',
    },
  };

  const video = {
    video: {
      type: 'object',
    },
  };

  return { image, audio, video };
};
