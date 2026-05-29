define(function (require) {
    var core = require('framework/core');
    var template = require('template!TokenExchangeStep');
    var Step = require('components/wizard/Step');
    var mobileBankApiService = require('services/mobileBankApiService');
    var MobileBankAccountStep = require('./MobileBankAccountStep');
    var ExternalAuthProviderStep = require('./ExternalAuthProviderStep');
    var accountService = require('services/accountService');

    return Step.extend({
        showActions: false,

        template: template,

        constructor: function () {
            this.base.apply(this, arguments);

            this.loading = ko.observable(false);
            this.errorMessage = ko.observable('');

            if (this.wizardState.token)
                this.init();
            else
                this.handleError();
        },

        init: function () {
            var me = this;

            me.loading(true);
            me.errorMessage('');

            mobileBankApiService.exchangeToken(this.wizardState.token)
                .then(
                    function (response) {
                        me.loading(false);

                        accountService.getBank(response.bankId).then(
                            function(bank) {
                                me.wizardState.bank = bank;

                                if (response.result === 'Success') {
                                    me.wizardState.bankCredentialsId = response.bankCredentialId;
                                    me.next();
                                } else {
                                    me.wizardState.error = response.error || 'Unknown';
                                    me.wizard.replaceStepsAndRestart([ExternalAuthProviderStep]);
                                }
                            });

                    },
                    function (error) {
                        error.acknowledge();
                        me.loading(false);

                        me.wizardState.error = 'Unknown';
                        me.wizard.replaceStepsAndRestart([ExternalAuthProviderStep]);
                    }
                );
        },

        handleError: function () {
            var me = this;

            if (me.wizardState.bankId) {
                me.loading(true);

                accountService.getBank(me.wizardState.bankId).then(
                    function (bank) {
                        me.loading(false);

                        me.wizardState.bank = bank;
                        me.wizard.replaceStepsAndRestart([ExternalAuthProviderStep]);
                    });
            } else {
                me.errorMessage(mobileBankApiService.getUnknownErrorMessage());
            }
        },

        complete: function(callback, abort) {
            var me = this;

            this.errorMessage('');

            mobileBankApiService
                .getAccounts({
                    bankId: me.wizardState.bank.id,
                    bankCredentialsId: me.wizardState.bankCredentialsId,
                    onlyAlreadyConnectedAccounts: me.wizardState.onlyAlreadyConnectedAccounts
                })
                .then(
                    function (result) {
                        me.processing(false);

                        me.wizardState.mobileBankApiAccounts = result.accounts;
                        me.wizardState.mergeCandidates = result.mergeCandidates;

                        // ensures credentials are updated if supportsUnattended changes
                        me.wizardState.bankCredentialsId = result.bankCredential.id;
                        me.wizardState.supportsUnattended = result.bankCredential.supportsUnattended;
                        accountService.fireAccountGroupsChanged();

                        if (me.wizardState.stepAfterLogin) {
                            me.wizard.addStep(me.wizardState.stepAfterLogin);
                        } else {
                            me.wizard.addStep(MobileBankAccountStep);
                        }

                        callback();
                    }
                );
        }
    });
});