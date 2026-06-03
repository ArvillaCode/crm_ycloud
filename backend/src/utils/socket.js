let ioInstance = null;

module.exports = {
  set: (io) => {
    ioInstance = io;
  },
  get: () => {
    ioInstance;
    return ioInstance;
  }
};
