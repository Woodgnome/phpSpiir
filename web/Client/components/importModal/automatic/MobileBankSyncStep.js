define(function(require) {
    var core = require('framework/core');
    var template = require('template!MobileBankSyncStep');
    var UploadStepBase = require('../shared/UploadStepBase');
    var mobileBankApiService = require('services/mobileBankApiService');
    var AccountView = require('./AccountView');
    var accountService = require('services/accountService');


    return UploadStepBase.extend({
        template: template,

        canGoBack: false,
        showActions: false,

        constructor: function() {
            this.base.apply(this, arguments);

            this.errorMessage = ko.observable();
            this.accounts = ko.observableArray();
            this.completingStep = ko.processingObservable();
            this.postingsFetched = ko.observable(false);

            this.highlightCount = ko.computed(function() {
                return this.accounts().sum(function(accountView) { return accountView.highlight() ? 1 : 0; });
            }, this);

            var me = this;
            this.allAccountsWasPreconfigured = ko.computed(function() {
                return me.accounts().every(function (aw) { return aw.isConfigured() || aw.state() === AccountView.states.failed; }); 
            }, this);
        },

        beforeShowing: function() {
            this.assertInWizardState('mobileBankApiAccountsToSync', 'bankCredentialsId');

            if (this.wizardState.mobileBankApiAccountsToSync.length === 0) {
                this.wizard.next();
            }

            var accountViews = this.wizardState.mobileBankApiAccountsToSync.map(function(a) {
                return new AccountView(a);
            });
                
            this.accounts(accountViews);
        },

        afterShowing: function() {
            this.processing(true);
            this.syncPostingsForAccount(this.wizardState.mobileBankApiAccountsToSync, 0);
        },

        syncPostingsForAccount: function (accounts, index) {
            var me = this;

            if (index >= accounts.length) {
                me.processing(false);
                me.postingsFetched(true);

                me.wizard.wizardState.logoffCalled = true;
                mobileBankApiService.logOff().then(function() {
                    if (me.allAccountsWasPreconfigured()) {
                        me.next();
                    } else {
                        accountService.fireAccountGroupsChanged();
                    }
                });
                return;
            }

            var account = accounts[index];
            var accountView = me.accounts().find(function (a) {
                return a.externalAccountId === account.externalAccountId;
            });

            accountView.markUpdating();

            var promise = $.when();

            if (account.mergeWithExisting && account.existingAccountToMerge) {
                promise = mobileBankApiService.changeExternalAccountId(account.existingAccountToMerge, account.externalAccountId);
            }

            promise.then(
                function() {
                    mobileBankApiService
                        .mobileBankSync(
                            me.bank.id,
                            me.wizardState.bankCredentialsId,
                            [account]
                        )
                        .then(
                            function(uploadResults) {
                                me.syncPostingsForAccount(accounts, index + 1);

                                uploadResults.forEach(
                                    function(uploadResult) {
                                        accountView.markComplete(uploadResult);
                                        me.addUploadToTotals(uploadResult);
                                    });
                            },
                            function(error) {
                                me.processing(false);
                                error.acknowledge();
                                me.errorMessage('Der opstod en fejl ved overførsel af poster. Prøv venligst igen senere');

                                accountView.markFailed();
                            }
                        );
                },
                function (error) {
                    me.processing(false);
                    error.acknowledge();
                    me.errorMessage('Der opstod en fejl ved overførsel af poster. Prøv venligst igen senere');

                    accountView.markFailed();
                });
        },

        complete: function(callback, abort) {
            var me = this;


            if (!me.allAccountsWasPreconfigured()) {
                alert('Indstil venligst alle nye konti.');
                abort();
                return;
            }

            this.completingStep.start();

            var actions = this
                .accounts()
                .filter(function (accountView) { return accountView.state() === AccountView.states.success })
                .map(function(accountView) { return accountView.getSaveAction(); })
                .filter(function(action) { return action !== null; });

            accountService
                .configureUploaderAccounts(actions)
                .then(this.completingStep.stop, this.completingStep.stop)
                .then(function() {
                    me.goToNextStep(callback);
                }, function(error) {
                    error.acknowledge();
                    alert('Der opstod en fejl når Spiir prøvede at gemme dine konti. Prøv at indstille dem manuelt, eller kontakt support.');
                    callback();
                });
        },

        dispose: function() {
            this.accounts().forEach(function(a) {
                a.dispose();
            });
            this.base();
        }
    });
});