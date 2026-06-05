define(function(require) {
    var core = require('framework/core');
    var template = require('template!EmailVerificationModal');
    var config = require('config');
    var session = require('session');

    var EmailVerificationModal = core.Popup.extend({
        template: template,

        constructor: function (options) {
            this.email = session.user.email;
            this.changeEmailUrl = config.urls['changeEmail'];
            this.verifyEmailUrl = config.urls['verifyEmail'];

            this.base({ disposeOnClose: false, showCloseLink: false });
        },
    });

    return EmailVerificationModal;
});