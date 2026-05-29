define(function (require) {
    var core = require('framework/core');
    var template = require('template!ExternalAuthProviderStep');
    var Step = require('components/wizard/Step');
    var mobileBankApiService = require('services/mobileBankApiService');
    var FileStep = require('../manual/FileStep');

    return Step.extend({
        showActions: false,

        template: template,

        constructor: function () {
            this.base.apply(this, arguments);

            this.assertInWizardState('bank');

            this.bank = this.wizardState.bank;

            this.loading = ko.observable(false);
            this.errorMessage = ko.observable('');

            this.pincodeHelpUrl = mobileBankApiService.getPincodeHelpUrl(this.bank);

            if (this.wizardState.error) {
                this.errorMessage(mobileBankApiService.getLoginErrorMessage(this.wizardState.error, this.bank));
            }
        },

        startAuthSession: function() {
            var me = this;

            me.loading(true);
            me.errorMessage('');

            var prepareOptions = {
                bankId: this.bank.id,
                onlyAlreadyConnectedAccounts: me.wizardState.onlyAlreadyConnectedAccounts,
                syncOnlyNewAccounts: me.wizardState.syncOnlyNewAccounts
            };

            var preparePromise;

            if (me.wizardState.bankCredentialsId) {
                prepareOptions.bankCredentialId = me.wizardState.bankCredentialsId;
                preparePromise = mobileBankApiService.prepareLoginWithCredential(prepareOptions);
            } else {
                preparePromise = mobileBankApiService.prepareNewLogin(prepareOptions);
            }

            return preparePromise
                .then(
                    function (response) {
                        me.loading(false);

                        // redirect to auth url
                        location.assign(response.data.authUrl);
                    },
                    function (error) {
                        error.acknowledge();
                        me.loading(false);

                        me.errorMessage(mobileBankApiService.getUnknownErrorMessage());
                    }
                );
        },

        goToManual: function () {
            this.wizard.replaceStepsAndRestart([FileStep]);
        }
    });
});