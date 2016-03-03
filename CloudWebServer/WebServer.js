var express = require('express');
var assert = require('assert');
var bodyParser = require('body-parser');
var session = require('client-sessions');
var CloudDBInterface = require('./CloudMongoInterface.js'); 

var app = express();
app.use(bodyParser.json()); // allow express to parse json params
app.use(session({
  cookieName: 'session',
  secret: 'random_string_goes_here',
  duration: 30 * 60 * 1000,
  activeDuration: 24 * 60 * 1000, //24 hours
}));

var cloudDbInterface = new CloudDBInterface('127.0.0.1', 27017, 'CookSmartCloud');

function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        var response = {
            status: "fail",
            message: "must be logged in to access this feature"
        };
        res.send(response);
    }
}

app.get('/GetRecipes', function(req, res) {
    var user = (req.session.user === null || req.session.user === undefined) ? null : req.session.user;
    debugger;
    cloudDbInterface.getRecipes(user, function(recipes) {
        res.send({ status: "ok", msg: "", recipes: recipes}); //if we make it this far it succeeded.  
    });
});

app.post('/Login', function(req, res) {
    console.log('Login request occurred');
    req.session.reset(); //session should be reset since the user is no longer logged in if this occurs.
    if (req.body.createAccount) {
        createAccount(req.body, res);
    } else {
        login(req.body, res);
    }
});

app.post('/CreateRecipe', isLoggedIn, function(req, res) {
    console.log('Create recipe request occurred');
    if (recipeRequestIsValid(req.body)) {
        var name = req.body.name;
        var instructions = req.body.instructions;
        cloudDbInterface.createRecipe(req.session.user, name, instructions, function(result) {
            var status = (result) ? "ok" : "fail";
            res.send( { status: status, msg: result.message } );
        });   
    }
});

function createAccount(params, res) {
    if (!accountParamsValid(params)) {
        res.send({status: "fail", msg: "The fields you entered are invalid."});
    } else {
        cloudDbInterface.createAccount(function(result) {
            var status = (result.success) ? "ok" : "fail";
            res.send({status: status, msg: result.msg});
        });  
    }
}

function login(credentials, res) {
    cloudDbInterface.areLoginCredentialsValid(credentials, function(result) {
        var status = (result.success) ? "ok" : "fail";
        res.send({status: status, msg: result.msg});
    });
}

function accountParamsValid(params) {
    var usernameValid = (params.username.length > 0) && (params.username.split(' ').length === 1);
    var passwordValid = params.password.length > 0;
    var displayNameValid = params.displayName.length > 0;
    var passwordConfirmationValid = params.password === params.passwordConfirmation;
    return usernameValid && passwordValid && displayNameValid && passwordConfirmationValid;
}

app.listen(8080, function () {
    console.log('CookSmart server is listening on port 8080.');
});
