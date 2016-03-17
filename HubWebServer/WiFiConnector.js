var cmd = require('node-cmd');

var WiFiConnector = {
    connectToWifi: function(ssid, password, type, next) {
        this.canSsidBeFound(ssid, function(found) {
            if (!found) {
                throw "ssid can not be found.";
            }
            switch (type) {
                case 'WPA': this.connectToWpaNetwork(ssid, password, next);
                //case 'WEP' : this.connectToWepNetwork(ssid, password);
            }
        });
    },
    
    canSsidBeFound: function(ssid, next) {
        cmd.get('sudo iwlist wlan0 scan | grep ' + ssid, function(result) {
            console.log(result);
            debugger;
            next(result !== null && result !== undefined && result !== "");
        });
    },
    
    connectToWpaNetwork: function(ssid, password, next) {
        //cmd.get('sudo grep /etc/network')
        cmd.get('sudo sed "s/wpa-ssid \\".*\\"/wpa-ssid \\"' + ssid + '\\"/g;s/wpa-psk \\".*\\"/wpa-psk \\"' + password + '\\"/g /etc/network/interfaces > /etc/network/interfaces', function(result) {
            next();
        });
    }
};
