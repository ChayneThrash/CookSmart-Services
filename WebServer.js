var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var app = express();


app.get('/GetCookerList', function(req, res) {
    console.log('Get cooker request occurred');
    MongoClient.connect('mongodb://127.0.0.1:27017/CookSmartHub', function(err, db) {
        assert.equal(null, err);
        var devicesCollection = db.collection('Devices');
        devicesCollection.find({}, {_id : 1}).toArray(function(err, doc) {
            console.log(doc);
            res.send( { docs : doc } );
            db.close();
        });
    });
});

app.listen(8080, function () {
  console.log('CookSmart server is listening on port 8080.');
});