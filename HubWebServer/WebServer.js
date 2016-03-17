var express = require('express');
var assert = require('assert');
var bodyParser = require('body-parser');
var deviceInterface = require('./DeviceInterface.js');
var cookSmartRecipes = require('./CookSmartRecipes.js')
var wifiConnector = require('./WiFiConnector.js');
var app = express();
app.use(bodyParser.json()); // allow express to parse json params


app.post('/LoadRecipe', function(req, res) {
    var recipe = req.body.recipe;
    if (cookSmartRecipes.isValid(recipe)) {
        var formattedRecipe = cookSmartRecipes.format(recipe);
        console.log(JSON.stringify({ formatted: formattedRecipe }));
        
        var serializedData = cookSmartRecipes.serialize(formattedRecipe);
        for(var i = 0; i < serializedData.length; ++i) {
            var num = (serializedData[i][2] << 16) + (serializedData[i][1] << 8) + (serializedData[i][0]);
            console.log((num).toString(16));
        }
        
        res.send({
            status: "ok"
        });
    } else {
        res.send({
            status: "fail",
            msg: "inavlid recipe"
        });
    }
});

app.get('/GetDeviceStatus', function(req, res) {
    var status = deviceInterface.getDeviceStatus();
    res.send(
    {
        status: "ok",
        deviceStatus: status
    });
});

app.post('/SetWifiCredentials', function(req, res) {
    wifiConnector.connectToWifi(req.body.ssid, req.body.password, 'WPA', function() {});
});

app.listen(8081, function () {
    console.log('CookSmart server is listening on port 8081.');
});