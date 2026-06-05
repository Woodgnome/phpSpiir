define(function(require) {
    var core = require('framework/core');
    var bindingHandlers = require('utilities/bindingHandlers');
    var config = require('config');
    var session = require('session');
    var SpiirApplication = require('SpiirApplication');

    var errorsSeen = {};
    window.onerror = function (msg, url, num) {
        var key = msg + url + num;

        if (errorsSeen[key])
            return;

        errorsSeen[key] = true;
        $.post(config.urls.logClientError, { message: msg, stackTrace: url + ':' + num, url: location.href });
    };

    $(document).ready(function() {
        var app = new SpiirApplication();
        app.launch();
    });
});
