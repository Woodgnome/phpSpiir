define(function (require) {
    var core = require('framework/core');
    var template = require('template!AutomaticUpdateStep');
    var Step = require('components/wizard/Step');
    var mobileBankApiService = require('services/mobileBankApiService');
    var MobileBankAccountStep = require('./MobileBankAccountStep');
    var MobileBankSyncStep = require('./MobileBankSyncStep');
    var ExternalAuthProviderStep = require('./ExternalAuthProviderStep');

    var step = Step.extend({
        template: template,

        showActions: false,

        constructor: function () {
            var me = this;
            this.base.apply(this, arguments);

            this.assertInWizardState('bank', 'bankCredentialsId', 'onlyAlreadyConnectedAccounts');
            this.bankName = this.wizardState.bank.name;

            if (typeof this.wizardState.loginToBank === 'undefined')
                this.wizardState.loginToBank = true;

            this.wizardState.onLoginSuccess = function () {
                me.processing(false);
                me.wizardState.loginToBank = false;
                me.wizard.addStep(step);
            };

            this.showErrorMessage = ko.observable(false);
            this.errorTitle = ko.observable(false);
            this.errorMessage = ko.observable(false);
            this.buttonText = ko.observable(true);
            this.buttonAction = function () {
                this._buttonAction();
            };
        },

        startAutomaticUpdate: function () {
            var me = this;
            this.processing(true);

            if (me.wizardState.supportsUnattended) {
                mobileBankApiService.unattendedLogin(me.wizardState.bankCredentialsId)
                    .then(function (result) {
                        me.processing(false);

                        if (result.success) {
                            me.wizardState.loginToBank = false;
                            me.getAccounts();
                        } else {
                            me.wizardState.bankCredentialsId = null;
                            me.wizard.replaceStepsAndRestart([ExternalAuthProviderStep]);
                        }
                    },
                        function (error) {
                            me._handleLoginError(error);
                        });
            } else {
                me.processing(false);
                me.wizard.replaceStepsAndRestart([ExternalAuthProviderStep]);
            }
        },

        _handleLoginError: function (error) {
            var me = this;
            me.processing(false);

            error.acknowledge();

            var errorMessage = mobileBankApiService.getErrorMessage(error.type);

            if (error.type === 'BlockedCredentials') {
                me.wizard.wizardState.automaticLoginFailed = { loginId: me.wizardState.loginId, bankCredentialsId: me.wizardState.bankCredentialsId, message: errorMessage.title };
                me.wizard.replaceStepsAndRestart([ExternalAuthProviderStep]);

                return;
            }

            if (error.type === 'LoginInUse' || error.type === 'NetbankDown') {
                me.showErrorMessage(true);
                me.buttonText(errorMessage.buttonText);
                me.errorTitle(errorMessage.title);
                me.errorMessage(errorMessage.message);

                me._buttonAction = function () {
                    me.wizard.complete();
                };

                return;
            }

            if (error.type === 'MissingCredentials' || error.type === 'InvalidCredentials' || error.type === 'InvalidLoginId' || error.type === 'InvalidLoginCode') {
                me.wizard.wizardState.automaticLoginFailed = { loginId: me.wizardState.loginId, bankCredentialsId: me.wizardState.bankCredentialsId, message: errorMessage.title };
                me.wizard.replaceStepsAndRestart([ExternalAuthProviderStep]);

                return;
            }

            me.showErrorMessage(true);
            me.buttonText('Forsøg igen');
            me.errorTitle('Øv... der opstod en fejl!');
            me.errorMessage('Det kan fx skyldes at der er midlertidigt udfald på adgangen til din mobilbank. Venligst prøv igen.');
            me._buttonAction = function () {
                me.retryLogin();
            };
        },

        beforeShowing: function () {
            this.startAutomaticUpdate(true);
        },

        retryLogin: function () {
            var me = this;

            me.showErrorMessage(false);
            me.startAutomaticUpdate();
        },

        getAccounts: function () {
            var me = this;

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

                        me.wizardState.mobileBankApiAccountsToSync = result.accounts.map(function (account) {
                            return {
                                externalAccountId: account.externalAccountId,
                                accountName: account.accountName,
                                accountIsNew: account.isNew
                            };
                        });

                        me.wizardState.bankCredentialsId = result.bankCredentialsId;

                        if (me.wizardState.onlyAlreadyConnectedAccounts) {
                            me.wizard.addStep(MobileBankSyncStep);
                            me.wizard.next();
                        } else {
                            me.wizard.addStep(MobileBankAccountStep);
                            me.wizard.next();
                        }
                    }
                );
        }
    });

    return step;
});
