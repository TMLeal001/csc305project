var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index');
});

router.post('/', function(req, res, next) {
  var id = req.body.id;
  var role = req.body.role;

  if (role == 'student') {
    var db = req.app.locals.db;

    var sql = `select CourseNo, OffTerm, OffYear,
                      FacFirstName, FacLastName, EnrGrade
               from Enrollment
               natural join Offering
               left join Faculty on Offering.FacSSN = Faculty.FacSSN
               where StdSSN = ?
               order by OffYear, OffTerm, CourseNo`;

    db.all(sql, [id], function(err, rows) {
      if (err) {
        return next(err);
      }

      var winterSql = `select Offering.CourseNo, OffLocation, OffTime, OffDays,
                              FacFirstName, FacLastName,
                              Enrollment.StdSSN as EnrolledSSN
                       from Offering
                       left join Faculty
                         on Offering.FacSSN = Faculty.FacSSN
                       left join Enrollment
                         on Offering.OfferNo = Enrollment.OfferNo
                         and Enrollment.StdSSN = ?
                       where OffTerm = 'WINTER'
                         and OffYear = 2026
                       order by Offering.CourseNo`;

      db.all(winterSql, [id], function(err, winterRows) {
        if (err) {
          return next(err);
        }

        res.render('student', {
          id: id,
          courses: rows,
          winterCourses: winterRows
        });
      });
    });
  }
  else if (role == 'faculty') {
    var db = req.app.locals.db;
  
    var sql = `select CourseNo, OffTerm, OffYear
               from Offering
               where FacSSN = ?
               order by OffYear, OffTerm, CourseNo`;
  
    db.all(sql, [id], function(err, rows) {
      if (err) {
        return next(err);
      }
  
      res.render('faculty', {
        id: id,
        courses: rows
      });
    });
  }
  else if (role == 'registrar') {
    var db = req.app.locals.db;
  
    var sql = `select OfferNo, Offering.CourseNo,
                      FacFirstName, FacLastName,
                      OffLocation, OffTime, OffDays
               from Offering
               left join Faculty
                 on Offering.FacSSN = Faculty.FacSSN
               where OffTerm = 'WINTER'
                 and OffYear = 2026
               order by OfferNo`;
  
    db.all(sql, [], function(err, rows) {
      if (err) {
        return next(err);
      }
  
      res.render('registrar', {
        id: id,
        offerings: rows
      });
    });
  }
  else {
    res.render('index');
  }
});

module.exports = router;