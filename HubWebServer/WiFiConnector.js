var cmd = require('node-cmd');

var WiFiConnector = {
    connectToWifi: function(ssid, password, type, next) {
        var self = this;
        this.canSsidBeFound(ssid, function(found) {
            if (!found) {
                throw "ssid can not be found.";
            }
            switch (type) {
                case 'WPA': self.connectToWpaNetwork(ssid, password, next);
                //case 'WEP' : self.connectToWepNetwork(ssid, password);
            }
        });
    },
    
    canSsidBeFound: function(ssid, next) {
        console.log(ssid);
        cmd.get('sudo iwlist wlan0 scan | grep ' + ssid, function(result) {
            console.log(result);
            debugger;
            next(result !== null && result !== undefined && result !== "");
        });
    },
    
    connectToWpaNetwork: function(ssid, password, next) {
        //cmd.get('sudo grep /etc/network')
        var x = 'sudo sed "s/wpa-ssid \\".*\\"/wpa-ssid \\"' + ssid + '\\"/g;s/wpa-psk \\".*\\"/wpa-psk \\"' + password + '\\"/g" /etc/network/interfaces > /etc/network/interfaces.bak && mv /etc/network/interfaces.bak /etc/network/interfaces';
        console.log(x);
        cmd.get(x, function(result) {
            console.log(result);
            cmd.get('sudo dhclient wlan0', function(result){
                next();
            }); 
        });
    }
};
module.exports = WiFiConnector;
