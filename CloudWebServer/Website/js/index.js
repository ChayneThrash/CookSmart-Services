var app = {
    
    server: 'http://192.168.1.31:8080',
    
    initialize: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    
    onDeviceReady: function() {
        if (!sessionStorage.user) {
             window.location.href = "login.html";   
        }
        document.addEventListener("backbutton", function() { navigator.app.exitApp(); }, false);
        app.drawRefreshButton();
        $("#recipe").on('click',function() { window.location.href="recipe.html"});
        //$(".refresh-button-container").on('click', app.updateDeviceList);
        $(".refresh-button-container").on('click', app.checkIsLogged);
        $("#deviceListItem").on('click', app.onDeviceSelection);
        $("#ConnectedToHub").hide();
        $("#startCooking").on('click', function() { onStartCooking});       
    },
    
    checkIsLoggedIn: function() {
        $.ajax({
            url: this.server + '/IsLoggedIn',
            type: "GET",
            success: function(response) {
                alert(JSON.stringify(response));
            }
        });
    },
    
    connectToDevice: function() {
        if (sessionStorage.user.deviceId == null) {
            setTimeout(connectToDevice, 5000);
        } else {
            var self = this;
            $.ajax({
                url: this.server + '/IsDeviceConnected',
                type: "POST",
                data: JSON.stringify({ deviceId : sessionStorage.user.deviceId }),
                contentType: "application/json; charset=utf-8",
                success: function(response) {
                    if (response.status === "ok") {
                        self.onHubInitialization();
                    } else {
                        setTimeout(connectToDevice, 5000);
                    }
                }
            });
        }
    },
    
    onHubInitialization: function() {
        $('#ConnectingToHub').hide();
        $('#ConnectedToHub').show();
        app.updateDeviceStatus();
    },
    
    updateDeviceStatus: function() {
        if (app.server === null) {
            alert('Please wait until hub has been connected.');
        } else {
            $.getJSON('http://' + app.server + ':' + app.serverPort + '/GetDeviceStatus', function(response) {
                    if (response.status === "ok") {
                   $("#device-status-text").text("Device status: " + response.deviceStatus);
                   var buttonProperties = {
                       text: (response.deviceStatus === 'idle') ? "Load Recipe" : "Stop",
                       onClick: (response.deviceStatus === 'idle') ? app.openLoadRecipeModal : app.stopDevice
                   };
                   $("#device-button").text(buttonProperties.text);
                   $("#device-button").on('click', buttonProperties.onClick);
               } else {
                    // handle error response.
               }
           }); // TODO: add a failure callback.   
        }
    },
    
    drawRefreshButton: function() {
        var buttonDiameter = $(".refresh-button-container").width();
        $(".refresh-button-container").css({height: buttonDiameter + "px"});
    },
    
    onStartCooking: function() {
        alert('Cooking has Now Begun.');
    }
};



