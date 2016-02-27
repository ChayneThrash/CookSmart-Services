var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var bodyParser = require('body-parser');
var app = express();
var passwordHash = require('password-hash');
app.use(bodyParser.json()); // allow express to parse json params

app.post('/Login', function(req, res)
{
    console.log('Login request occurred');
    MongoClient.connect('mongodb://127.0.0.1:27017/CookSmartCloud', function(err, db) {
        assert.equal(null, err);
        console.log(req.body.createAccount);
        debugger;
        var params = {
            username: req.body.username,
            password: req.body.password,
            displayName: req.body.displayName,
            passwordConfirmation: req.body.passwordConfirmation
        }
        if (req.body.createAccount) {
            createAccount(req.body, db, res);
        } else {
            login(req.body, db, res);
        }
    });
});

function createAccount(params, db, res) {
    var response = {
        status: "ok"
    };
    if (!accountParamsValid(params)) {
        response["message"] = "The fields you entered are invalid.";
        res.send(response);
        db.close();
        return;
    }
    var collection = db.collection('Users');
    console.log("blah");
    collection.findOne({ username: params.username }, function(err, item) {
        if (!item) {
            console.log("blah");
            collection.insertOne({ username: params.username, password: passwordHash.generate(params.password), displayName: params.displayName },
            function(err, result) {
                if (err !== null || !result) {
                    response.status = "fail";
                    response["message"] = "unknown error";
                } 
                res.send(response);
                db.close();
            });
        } else {
            console.log("blah");
            response.status = "fail";
            response["message"] = "account already exists";
            res.send(response);
            db.close();
        }
    });
}

function login(params, db, res) {
    var response = {
        status: "ok"
    };
    var collection = db.collection('Users');
    console.log("blah");
    collection.findOne({ username: params.username }, {}, function(err, item) {
        debugger;
        if (err !== null) {
            response.status = "fail";
            response["message"] = "unknown error.";
        } else if (!item || !passwordHash.verify(params.password, item.password)) {
            response.status = "fail";
            response["message"] = "user does not exist.";
        } else {
            response["user"] = {
                userId: item._id,
                username: item.username
            };
        }
        db.close();
        res.send(response);
    });
}

function accountParamsValid(params) {
    debugger;
    var usernameValid = (params.username.length > 0) && (params.username.split(' ').length === 1);
    var passwordValid = params.password.length > 0;
    var displayNameValid = params.displayName.length > 0;
    var passwordConfirmationValid = params.password === params.passwordConfirmation;
    return usernameValid && passwordValid && displayNameValid && passwordConfirmationValid;
}

app.listen(8080, function () {
    console.log('CookSmart server is listening on port 8080.');
});
