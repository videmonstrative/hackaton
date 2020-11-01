var express = require('express');
var path = require('path');

var apiRouter = require('./routes/api');

var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/checker', apiRouter);

module.exports = app;
