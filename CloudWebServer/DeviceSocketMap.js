DeviceSocketMap = {
    deviceIdSocketHash: {},
    
    deviceConnected: function(deviceId) {
        return this.deviceIdSocketHash.hasOwnProperty(deviceId);
    },
    
    getDeviceConnection: function(deviceId) {
        return deviceIdSocketHash[deviceId];
    },
    
    connectDevice: function(deviceId, socket) {
        this.deviceIdSocketHash[deviceId] = socket;
    },
    
    removeConnection: function(deviceId) {
        if (this.deviceIdSocketHash.hasOwnProperty(deviceId)) {
            delete this.deviceIdSocketHash[deviceId];
        }
    }
    
};

module.exports = DeviceSocketMap;