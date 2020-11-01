var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({
    msg: 'respond with a resource'
  });
});

module.exports = router;
