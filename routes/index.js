var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index');
});

router.post('/', function(req, res, next) {
  var id = req.body.id;
  var role = req.body.role;

  if (role == 'student') {
    res.render('student', { id: id });
  }
  else if (role == 'faculty') {
    res.render('faculty', { id: id });
  }
  else if (role == 'registrar') {
    res.render('registrar', { id: id });
  }
  else {
    res.render('index');
  }
});

module.exports = router;
