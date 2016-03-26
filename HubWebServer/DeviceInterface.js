//var gpio = require("pi-gpio");
var raspi = require('raspi');
var I2C = require('raspi-i2c').I2C;

var SLAVE_ADDR = 0x05;

var DeviceInterface = function(){
    this.currentRecipe = [];
    this.interfaceInitialized = false;
    var self = this;
    raspi.init(function() {
       self.i2C = new I2C();
       self.interfaceInitialized = true;
    });
}; 
       
DeviceInterface.prototype.getDeviceStatus = function() {
    return "idling";
};

DeviceInterface.prototype.loadSerializedRecipe = function(bytes) {
    this.i2C.writeSync(SLAVE_ADDR, bytes);
};

module.exports = DeviceInterface;
