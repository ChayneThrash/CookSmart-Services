var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json()); // allow express to parse json params


app.get('/Login', function(req, res) {
    console.log('Login request occurred');
    MongoClient.connect('mongodb://127.0.0.1:27017/CookSmartHub', function(err, db) {
        assert.equal(null, err);
        var devicesCollection = db.collection('Devices');
        
        if (req.body.createAccount) {
            var accountRequest = {
                username: req.body.username,
                password: req.body.password,
                passwordConfirmation: req.body.passwordConfirmation,
                displayName: req.body.displayName
            };
            createAccount(accountRequest, db, res);
        } else {
            login(accountRequest, db, res);
        }
        
    });
});

app.listen(8080, function () {
    console.log('CookSmart server is listening on port 8080.');
});