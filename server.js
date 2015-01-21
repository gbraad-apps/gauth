'use strict';

// get port from environment settings for deployment on Heroku
var EXPRESS_PORT = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 4000;
var EXPRESS_IPADDR = process.env.OPENSHIFT_NODEJS_IP || process.env.IPADDR || '127.0.0.1';
var EXPRESS_ROOT = __dirname;

function startExpress(root, port, ipaddr) {
  var express = require('express');
  var app = express();
  app.use(express.static(root));
  app.listen(port, ipaddr, function() {
    console.log('Listening on %s:%d',
		ipaddr, port);
  });
}

startExpress(EXPRESS_ROOT, EXPRESS_PORT, EXPRESS_IPADDR);
