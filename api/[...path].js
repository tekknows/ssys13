const { server } = require('../backend/server');

module.exports = function handleApiRequest(req, res) {
  server.emit('request', req, res);
};
