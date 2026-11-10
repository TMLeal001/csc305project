var express = require('express');
var router = express.Router();

function showStudent(req, res, next, id) {
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

    var winterSql = `select Offering.OfferNo, Offering.CourseNo,
                            OffLocation, OffTime, OffDays,
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

router.get('/', function(req, res, next) {
  res.render('index');
});

router.post('/', function(req, res, next) {
  var id = req.body.id;
  var role = req.body.role;

  if (role == 'student') {
    showStudent(req, res, next, id);
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

router.post('/student/change', function(req, res, next) {
  var db = req.app.locals.db;
  var id = req.body.id;
  var offerNo = req.body.offerNo;
  var action = req.body.action;

  if (action == 'enroll') {
    var checkSql = `select OfferNo
                    from Offering
                    where OfferNo = ?
                      and OffTerm = 'WINTER'
                      and OffYear = 2026`;

    db.get(checkSql, [offerNo], function(err, offering) {
      if (err) {
        return next(err);
      }

      if (!offering) {
        return res.send('Course not available.');
      }

      var enrolledSql = `select *
                         from Enrollment
                         where StdSSN = ?
                           and OfferNo = ?`;

      db.get(enrolledSql, [id, offerNo], function(err, enrollment) {
        if (err) {
          return next(err);
        }

        if (enrollment) {
          return showStudent(req, res, next, id);
        }

        var insertSql = `insert into Enrollment(StdSSN, OfferNo)
                         values(?, ?)`;

        db.run(insertSql, [id, offerNo], function(err) {
          if (err) {
            return next(err);
          }

          showStudent(req, res, next, id);
        });
      });
    });
  }
  else if (action == 'drop') {
    var deleteSql = `delete from Enrollment
                     where StdSSN = ?
                       and OfferNo = ?`;

    db.run(deleteSql, [id, offerNo], function(err) {
      if (err) {
        return next(err);
      }

      showStudent(req, res, next, id);
    });
  }
  else {
    showStudent(req, res, next, id);
  }
});

module.exports = router;