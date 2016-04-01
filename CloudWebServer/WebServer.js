var express = require('express');
var expressSession = require('express-session');
var assert = require('assert');
var bodyParser = require('body-parser');
var cookie = require('cookie');
var cookieSignature = require('cookie-signature');
var CloudDBInterface = require('./CloudMongoInterface.js');
var WebSocket = require('nodejs-websocket');
var DeviceSocketMap = require('./DeviceSocketMap.js');

var app = express();
app.use(bodyParser.json()); // allow express to parse json params

app.use(function(req, res, next) {
 
    var sessionId = (req.body.hasOwnProperty('sessionId')) ? req.body.sessionId : null;
    // if there was a session id passed add it to the cookies
    if (sessionId) {
        var header = req.headers.cookie;
        // sign the cookie so Express Session unsigns it correctly
        var signedCookie = 's:' + cookieSignature.sign(sessionId, 'keyboard cat');
        req.headers.cookie = cookie.serialize('sessionId', signedCookie);
    }
    next(); 
});

app.use(expressSession({
      'cookie': {
          'httpOnly': false,
          'maxAge': 1000 * 60 * 60 * 24 * 60
      },
      'name': 'sessionId',
      'secret': 'keyboard cat',
      'saveUninitialized': true,
      'genid': function(req) {

          var sessionId = (req.body.hasOwnProperty('sessionId')) ? req.body.sessionId : null;
          return sessionId;
      }
}));

app.use(express.static('Website'));

var cloudDbInterface = new CloudDBInterface('127.0.0.1', 27017, 'CookSmartCloud');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


function isLoggedIn(req, res, next) {
    if (req.session.hasOwnProperty('user') && req.session['user']) {
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

app.post('/GetRecipes', function(req, res) {
    var user = (!req.session.hasOwnProperty('user') || req.session.user == null) ? null : req.session.user;
    
    cloudDbInterface.getRecipes(user, function(recipes) {
        res.send({ status: "ok", msg: "", recipes: recipes}); //if we make it this far it succeeded.  
    });
});

app.post('/Login', function(req, res) {
    console.log('Login request occurred');
    if (req.session.hasOwnProperty('user')){
        req.session['user'] = null;
    }
    if (req.body.createAccount) {
        createAccount(req.body, req, res);
    } else {
        
        login(req.body, req, res);
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

app.post('/IsLoggedIn', function(req, res){
    debugger;
    res.send( {status: (req.session.user) ? true : false});
});

function createAccount(params, req, res) {
    if (!accountParamsValid(params)) {
        res.send({status: "fail", msg: "The fields you entered are invalid."});
    } else {
        cloudDbInterface.createAccount(params, function(result) {
            var status = (result.success) ? "ok" : "fail";
            if (result.success) {
                req.session['user'] = { username: params.username, deviceId: null };
            }
            res.send({status: status, msg: result.msg});
        });  
    }
}

function login(credentials, req, res) {
    cloudDbInterface.areLoginCredentialsValid(credentials, function(user, result) {
        var status = (result.success) ? "ok" : "fail";
        if (result.success) {
            debugger;
            req.session['user'] = { username: user.username, deviceId: user.deviceId };
        }
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

app.post('/GetDeviceStatus', isLoggedInAndDeviceConnected, function(req, res, conn) {
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
