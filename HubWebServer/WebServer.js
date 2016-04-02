var assert = require('assert');
var DeviceInterface = require('./DeviceInterface.js');
var cookSmartRecipes = require('./CookSmartRecipes.js')
var wifiConnector = require('./WiFiConnector.js');
var deviceInterface = new DeviceInterface();
var ws = require('nodejs-websocket')


function LoadRecipe(conn, params) {
    console.log('LoadRecipe');
    var recipe = params.recipe;
    if (cookSmartRecipes.isValid(recipe)) {
        var formattedRecipe = cookSmartRecipes.format(recipe);
        console.log(JSON.stringify({ formatted: formattedRecipe }));
        
        var serializedData = cookSmartRecipes.serialize(formattedRecipe);
        for(var i = 0; i < serializedData.length; ++i) {
            var num = (serializedData[i][2] << 16) + (serializedData[i][1] << 8) + (serializedData[i][0]);
            var buf = new Buffer([serializedData[i][2], serializedData[i][1], serializedData[i][0]]);
            console.log(buf.length);
            deviceInterface.loadSerializedRecipe(buf);

            console.log((num).toString(16));
        }
        
        conn.send(JSON.stringify({
            status: "ok"
        }));
    } else {
        conn.send(JSON.stringify({
            status: "fail",
            msg: "inavlid recipe"
        }));
    }
}

function GetDeviceStatus(conn, params) {
    console.log('Get device status.');
    debugger;
    var status = deviceInterface.getDeviceStatus();
    conn.send(JSON.stringify({
        status: "ok",
        deviceStatus: status
    }));
}

function SetWifiCredentials(conn, params) {
    console.log('set wifi credentials request.');
    wifiConnector.connectToWifi(params.ssid, params.password, 'WPA', function() {});
    conn.send(JSON.stringify({status: "ok"}));
}

function processMessage(conn, params) {
    switch (params.procedure) {
        case 'LoadRecipe': LoadRecipe(conn, params); break;
        case 'GetDeviceStatus': GetDeviceStatus(conn, params); break;
        case 'SetWifiCredentials': SetWifiCredentials(conn, params); break;
    }
}

var deviceId = 'device1'; //hardcoding something here for now.

function connectToCookSmartServer() {
    console.log('connecting');
    var conn = ws.connect('ws://cthrash.local:8082');
    conn.on('connect', function(){
        conn.send(JSON.stringify({procedure: 'connectDevice', deviceId: deviceId}));    
    });
    conn.on('text', function(text) { // going ahead and setting it up to handle connectDevice response.
        var response = JSON.parse(text);
        if (response.status === 'ok') {
            if (response.hasOwnProperty('deviceParams')){
                processMessage(this, response.deviceParams);   
            }
        } else {
            conn.close(); //there was an error. reconnect.
        }
    });
    conn.on('close', function() {
        console.log('disconnected');
        setTimeout(connectToCookSmartServer, msBetweenConnectionAttempts); // Need to attempt to reconnect occasionally.
    });
    conn.on('error', function(err) {
        console.log(JSON.stringify(err));
         //don't do anything. just let it pass on to close.
    });
}

var msBetweenConnectionAttempts = 10000; //attempt to connect to the server every ten seconds.
setTimeout(connectToCookSmartServer, msBetweenConnectionAttempts);