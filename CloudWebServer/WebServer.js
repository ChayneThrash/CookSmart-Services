var express = require('express');
var assert = require('assert');
var bodyParser = require('body-parser');
var session = require('client-sessions');
var CloudDBInterface = require('./CloudMongoInterface.js');
var WebSocket = require('nodejs-websocket');
var DeviceSocketMap = require('./DeviceSocketMap.js');

var app = express();
app.use(bodyParser.json()); // allow express to parse json params
app.use(session({
  cookieName: 'session',
  secret: 'random_string_goes_here',
  duration: 30 * 60 * 1000,
  activeDuration: 24 * 60 * 1000, //24 hours
}));

var cloudDbInterface = new CloudDBInterface('127.0.0.1', 27017, 'CookSmartCloud');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


function isLoggedIn(req, res, next) {
    if (req.session.user) {
        next(req, res);
    } else {
        var response = {
            status: "fail",
            message: "must be logged in to access this feature"
        };
        res.send(response);
    }
}

function isLoggedInAndDeviceConnected(req, res, next) {
    isLoggedIn(req, res, function() { // this gets called if the user is logged in.
        isDeviceConnected(req, res, next);      
    });
}

function isDeviceConnected(req, res, next) {
    cloudDBInterface.userIsConnectedToDevice(req.session.user, req.body.deviceId, function(connected) {
        if (connected) {
            if (DeviceSocketMap.deviceConnected(req.body.deviceId)) {
                next(req, res, DeviceSocketMap.getConnecedDevice(deviceId));
            } else {
              res.send({status: "fail", msg: "device is not connected to the server."});
            }
        } else {
            res.send({ status: "fail", msg: "user is not connected to that device." })
        }
    });   
}

app.get('/GetRecipes', function(req, res) {
    var user = (req.session.user === null || req.session.user === undefined) ? null : req.session.user;
    
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
            var status = (result.success) ? "ok" : "fail";
            res.send( { status: status, msg: result.message } );
        });   
    }
});

app.post('/ConnectToDevice', isLoggedIn, function(req, res) {
    console.log('connect to device request occurred');
    cloudDbInterface.connectUserToDevice(req.session.user, req.body.deviceId, function(result){
        var status = (result.success) ? "ok" : "fail";
        res.send( { status: status, msg: result.message } );
    });
});

function createAccount(params, res) {
    if (!accountParamsValid(params)) {
        res.send({status: "fail", msg: "The fields you entered are invalid."});
    } else {
        cloudDbInterface.createAccount(params, function(result) {
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

app.post('/LoadRecipe', function(req, res, conn) {
    conn.on('text', function(text) {
        res.send(JSON.parse(text));
    });
    conn.send(JSON.stringify({ procedure: 'LoadRecipe', params: req.body.deviceParams }));
});

app.get('/GetDeviceStatus', isLoggedInAndDeviceConnected, function(req, res, conn) {
    conn.on('text', function(text) {
        res.send(JSON.parse(text));
    });
    conn.send(JSON.stringify({ procedure: 'GetDeviceStatus', params: req.body.deviceParams }));
});

app.post('/SetWifiCredentials', isLoggedInAndDeviceConnected, function(req, res, conn) {
    conn.on('text', function(text) {
        res.send(JSON.parse(text));
    });
    conn.send(JSON.stringify({ procedure: 'SetWifiCredentials', params: req.body.deviceParams }));
});

var deviceServer = WebSocket.createServer(function(conn) {
    var deviceId;
    conn.on('text', function(text) {
        var params = JSON.parse(text);
        if (params.hasOwnProperty('procedure')){
            if(params.procedure === 'connectDevice' && params.hasOwnProperty('deviceId')) {
                DeviceSocketMap.connectDevice(params.deviceId, conn);
                console.log('device connected.');
                deviceId = params.deviceId;
                conn.send(JSON.stringify({procedure: "connectDevice", status: "ok"}));
            }
        }
    });
    conn.on('close', function() {
        if (deviceId !== undefined && deviceId !== null) { // check if device ever sent the connection request
            DeviceSocketMap.removeConnection(deviceId); // remove it from the hash
            console.log('device disconneced');
        }
    });
}).listen(8082);
