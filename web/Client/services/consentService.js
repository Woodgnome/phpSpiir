define(function(require) {
    var networkService = require('./networkService');
    var ConsentModal = require('components/consentModal/ConsentModal');
    var config = require('config');
    var when = require('lib/when');

    return {
        getConsent: function (options) {
            var me = this;

            return when(networkService
                .ajaxPost('getConsent', {
                    consentId: options.consentId
                }))
                .then(function (response) {
                    if (response.granted) {
                        return true;
                    } else {
                        return ConsentModal.show({
                            consent: response.consent,
                            onAccept: me.accept,
                            onReject: me.reject
                        });
                    }
                }).then(function (response) {
                    return response;
                });
        },

        hasConsent: function(options) {
            return networkService
                .ajaxPost('hasConsent', {
                    consentId: options.consentId
                });
        },

        accept: function(options) {
            return networkService
                .ajaxPost('acceptConsent', {
                    userConsentId: options.userConsentId
                });
        },

        reject: function (options) {
            return networkService
                .ajaxPost('rejectConsent', {
                    userConsentId: options.userConsentId
                });
        },

        revoke: function(options) {
            return networkService
                .ajaxPost('revokeConsent', {
                    userConsentId: options.userConsentId
                });
        }
    };
});