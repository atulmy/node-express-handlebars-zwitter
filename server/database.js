'use strict';

let mongoose = require('mongoose');

// Mongoose
// Config
mongoose.connect('mongodb://localhost/zwitter');
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('LOGGED | MongoDB Connected - ' + new Date());
});

module.exports = db;
