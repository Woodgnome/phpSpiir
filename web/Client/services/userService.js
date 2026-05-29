define(function(require) {
    var networkService = require('./networkService');

    return {
        updateSeenTermsVersion: function(version) {
            return networkService.ajaxPost('updateSeenTermsVersion', { version: version });
        }
    };
});