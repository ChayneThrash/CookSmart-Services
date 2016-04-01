var login = {
    
    createAccountToggledOn: false,
    
    onPageLoad: function() {
        document.addEventListener("backbutton", function() { navigator.app.exitApp(); }, false);
        $(".create-account-field").hide();
        $("#login-submit-button").on('click', login.sendLoginRequest);
        $("#login-create-button").on('click', login.modifyPageForAccountCreation);
    },
    
    sendLoginRequest: function() {
        var params = {
            username: $("#user-name-field").val(),
            password: $("#password-field").val(),
            passwordConfirmation: $("#password-confirmation-field").val(),
            displayName: $("#display-name-field").val(),
            createAccount: login.createAccountToggledOn
        };
        $.ajax({
            url: "/Login",
            type: "POST",
            data: JSON.stringify(params),
            contentType: "application/json; charset=utf-8",
            success: function(response) {
               if (response.status === "ok") {
                    window.sessionStorage.user = response.user;
                    window.location.href = "index.html";
               } else {
                    alert(response.message);
               }
            }
        });
    },
    
    modifyPageForAccountCreation() {
        login.swapButtonText();
        $(".create-account-field").toggle();
        $("#password-confirmation-field").val("");
        $("#display-name-field").val("");
        login.createAccountToggledOn = !login.createAccountToggledOn;
    },
    
    swapButtonText()
    {
        var loginButtonText = $("#login-submit-button").text();
        $("#login-submit-button").text($("#login-create-button").text()); 
        $("#login-create-button").text(loginButtonText);
    }
    
};

$(document).ready(login.onPageLoad);