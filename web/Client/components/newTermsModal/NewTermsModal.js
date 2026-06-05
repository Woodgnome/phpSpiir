define(function(require) {
    var core = require('framework/core');
    var template = require('template!NewTermsModal');
    var userService = require('services/userService');
    var config = require('config');

    var NewTermsModal = core.Popup.extend({
        template: template,

        constructor: function (options) {
            this.termsUrl = options.termsUrl;
            this.privacyPolicyUrl = options.privacyPolicyUrl;
            this.feedbackEmail = 'mailto:' + config.feedbackEmail;

            this.base({ disposeOnClose: false, showCloseLink: false });


            this.bind('open', function() {
                userService.updateSeenTermsVersion(options.version);
            });
        },

        showTerms: function () {
            window.open(this.termsUrl, '_blank');

        },

        showPrivacyPolicy: function () {
            window.open(this.privacyPolicyUrl, '_blank');
        }
    });

    return NewTermsModal;
});