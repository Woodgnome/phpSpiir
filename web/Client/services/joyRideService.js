define(function(require) {
    var session = require('session');
    var networkService = require('services/networkService');


    return {
        hasUserSeenJoyRide: function(joyRideId) {
            return session.user.joyRideSteps[joyRideId.camelCase()] > 0;
        },

        markStepAsSeen: function (joyRideId, step) {
            if (session.user.joyRideSteps[joyRideId.camelCase()] >= step) {
                var d = $.Deferred();
                d.resolve();
                return d;
            }

            session.user.joyRideSteps[joyRideId.camelCase()] = step;
            return networkService.ajaxPost('markJoyRideStepAsSeen', { id: joyRideId, step: step });
        }
    };
});