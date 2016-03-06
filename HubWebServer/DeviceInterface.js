//var gpio = require("pi-gpio");

var DeviceInterface = {
    
    currentRecipe: [],
    
    getDeviceStatus: function() {
        return "idling";
    }
}

module.exports = DeviceInterface;