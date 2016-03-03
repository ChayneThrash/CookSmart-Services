var express = require('express');
var assert = require('assert');
var deviceInterface = require('./DeviceInterface.js');
var app = express();


app.post('/LoadRecipe', function(req, res) {
    deviceInterface.recipe = req.body.recipe;
    res.send(
    {
        status: "ok"
    });
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

});

app.listen(8081, function () {
    console.log('CookSmart server is listening on port 8081.');
});