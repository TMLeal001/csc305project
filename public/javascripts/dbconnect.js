var sqlite3 = require('sqlite3').verbose();

function openDatabase(filename) {
  var db = new sqlite3.Database(filename, function(err) {
    if (err) {
      console.log(err.message);
    }
  });

  return db;
}

function closeDatabase(db) {
  db.close(function(err) {
    if (err) {
      console.log(err.message);
    }
  });
}

module.exports = {
  openDatabase,
  closeDatabase
};