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

function showFacultyGrades(req, res, next, id, offerNo) {
  var db = req.app.locals.db;

  var sql = `select Student.StdSSN, StdFirstName,
                    StdLastName, EnrGrade
             from Enrollment
             inner join Student
               on Enrollment.StdSSN = Student.StdSSN
             where OfferNo = ?
             order by StdLastName, StdFirstName`;

  db.all(sql, [offerNo], function(err, rows) {
    if (err) {
      return next(err);
    }

    res.render('faculty-grades', {
      id: id,
      offerNo: offerNo,
      students: rows
    });
  });
}

function showRegistrar(req, res, next, id) {
  var db = req.app.locals.db;

  var offeringSql = `select OfferNo, Offering.CourseNo,
                            FacFirstName, FacLastName,
                            OffLocation, OffTime, OffDays
                     from Offering
                     left join Faculty
                       on Offering.FacSSN = Faculty.FacSSN
                     where OffTerm = 'WINTER'
                       and OffYear = 2026
                     order by OfferNo`;

  db.all(offeringSql, [], function(err, offerings) {
    if (err) {
      return next(err);
    }

    var courseSql = `select CourseNo, CrsDesc, CrsUnits
                     from Course
                     order by CourseNo`;

    db.all(courseSql, [], function(err, courses) {
      if (err) {
        return next(err);
      }

      var facultySql = `select FacSSN, FacFirstName, FacLastName
                        from Faculty
                        order by FacLastName, FacFirstName`;

      db.all(facultySql, [], function(err, faculty) {
        if (err) {
          return next(err);
        }

        res.render('registrar', {
          id: id,
          rows: offerings,
          courses: courses,
          faculty: faculty
        });
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

    var sql = `select OfferNo, CourseNo, OffTerm, OffYear
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
    showRegistrar(req, res, next, id);
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

router.post('/faculty/grades', function(req, res, next) {
  var id = req.body.id;
  var offerNo = req.body.offerNo;

  showFacultyGrades(req, res, next, id, offerNo);
});

router.post('/faculty/update-grade', function(req, res, next) {
  var db = req.app.locals.db;
  var id = req.body.id;
  var offerNo = req.body.offerNo;
  var stdSSN = req.body.stdSSN;
  var grade = req.body.grade;

  if (grade == '') {
    grade = null;
  }

  var sql = `update Enrollment
             set EnrGrade = ?
             where StdSSN = ?
               and OfferNo = ?`;

  db.run(sql, [grade, stdSSN, offerNo], function(err) {
    if (err) {
      return next(err);
    }

    showFacultyGrades(req, res, next, id, offerNo);
  });
});

router.post('/registrar/add', function(req, res, next) {
  var db = req.app.locals.db;
  var id = req.body.id;
  var offerNo = req.body.offerNo;
  var courseNo = req.body.courseNo;
  var facSSN = req.body.facSSN;
  var location = req.body.location;
  var time = req.body.time;
  var days = req.body.days;

  if (facSSN == '') {
    facSSN = null;
  }

  var sql = `insert into Offering
             (OfferNo, CourseNo, OffLocation, OffDays,
              OffTerm, OffYear, FacSSN, OffTime)
             values(?, ?, ?, ?, 'WINTER', 2026, ?, ?)`;

  db.run(
    sql,
    [offerNo, courseNo, location, days, facSSN, time],
    function(err) {
      if (err) {
        return next(err);
      }

      showRegistrar(req, res, next, id);
    }
  );
});

router.post('/registrar/edit', function(req, res, next) {
  var db = req.app.locals.db;
  var id = req.body.id;
  var offerNo = req.body.offerNo;

  var offeringSql = `select *
                     from Offering
                     where OfferNo = ?
                       and OffTerm = 'WINTER'
                       and OffYear = 2026`;

  db.get(offeringSql, [offerNo], function(err, offering) {
    if (err) {
      return next(err);
    }

    var facultySql = `select FacSSN, FacFirstName, FacLastName
                      from Faculty
                      order by FacLastName, FacFirstName`;

    db.all(facultySql, [], function(err, faculty) {
      if (err) {
        return next(err);
      }

      res.render('registrar-edit', {
        id: id,
        offering: offering,
        faculty: faculty
      });
    });
  });
});

router.post('/registrar/update', function(req, res, next) {
  var db = req.app.locals.db;
  var id = req.body.id;
  var offerNo = req.body.offerNo;
  var facSSN = req.body.facSSN;
  var location = req.body.location;
  var time = req.body.time;
  var days = req.body.days;

  if (facSSN == '') {
    facSSN = null;
  }

  var sql = `update Offering
             set FacSSN = ?,
                 OffLocation = ?,
                 OffTime = ?,
                 OffDays = ?
             where OfferNo = ?
               and OffTerm = 'WINTER'
               and OffYear = 2026`;

  db.run(
    sql,
    [facSSN, location, time, days, offerNo],
    function(err) {
      if (err) {
        return next(err);
      }

      showRegistrar(req, res, next, id);
    }
  );
});

router.post('/registrar/cancel', function(req, res, next) {
  var db = req.app.locals.db;
  var id = req.body.id;
  var offerNo = req.body.offerNo;

  var deleteEnrollmentSql = `delete from Enrollment
                             where OfferNo = ?`;

  db.run(deleteEnrollmentSql, [offerNo], function(err) {
    if (err) {
      return next(err);
    }

    var deleteOfferingSql = `delete from Offering
                             where OfferNo = ?
                               and OffTerm = 'WINTER'
                               and OffYear = 2026`;

    db.run(deleteOfferingSql, [offerNo], function(err) {
      if (err) {
        return next(err);
      }

      showRegistrar(req, res, next, id);
    });
  });
});

module.exports = router;