define(function(require) {
    var config = require('config');
    var session = require('session');
    var networkService = require('services/networkService');



    function isLoginExpired() {
        var cookieValue = $.cookie('SessionExpires');
        if (!cookieValue)
            return true;

        var loginExpires = new Date(parseFloat(cookieValue));
        return loginExpires < new Date();
    }

    return {
        prolongUserSession: function() {
            return networkService.ajaxPost('prolongUserSession');
        },

        setupLoggedOnCheck: function() {
            if (isLoginExpired())
                return;

            setInterval(function() {
                if (isLoginExpired()) {
                    var expiredLogOffUrl = config.urls.logOffWhenExpired + '?' + $.param({
                        returnUrl: location.href
                    });
                    location.assign(expiredLogOffUrl);
                }
            }, 10000);
        }
    };
});