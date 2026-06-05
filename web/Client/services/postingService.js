define(function(require) {
    var core = require('framework/core');
    var networkService = require('services/networkService');
    var session = require('session');


    core.hub.on('postingsImported', function() {
        session.user.hasPostings = true;
    });

    return {
        getPostings: function(filters) {
            return networkService.ajaxGet('getPostings', filters);
        }
    };
});
