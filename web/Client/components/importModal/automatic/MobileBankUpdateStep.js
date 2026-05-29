define(function(require) {
    var core = require('framework/core');
    var template = require('template!MobileBankUpdateStep');
    var UploadStepBase = require('../shared/UploadStepBase');
    var mobileBankApiService = require('services/mobileBankApiService');
    var accountService = require('services/accountService');

    return UploadStepBase.extend({
        template: template,

        canGoBack: false,
        showActions: false,

        constructor: function() {
            this.base.apply(this, arguments);

            this.assertInWizardState('mobileBankApiAccounts', 'bank', 'bankCredentialsId');

            this.errorMessage = ko.observable();
            this.accounts = this.wizardState.mobileBankApiAccounts;
        },

        afterShowing: function() {
            var me = this;
            if (this.wizardState.mobileBankApiAccounts.length === 0) {
                me.errorMessage('Vi kunne desværre ikke opdatere dine konti. Typisk skyldes det, at du ikke længere har adgang til disse konti i mobilbanken eller at dine konti har fået nyt reg.nr. Kontakt <a href="mailto:support@spiir.dk">support@spiir.dk</a> hvis du mener, at det ikke skyldes nogen af disse.');
            } else {
                this.processing(true);

                mobileBankApiService
                    .mobileBankSync(
                        this.bank.id,
                        this.wizardState.bankCredentialsId,
                        this.wizardState.mobileBankApiAccounts
                        )
                    .then(
                        function(uploadResults) {
                            accountService.fireAccountGroupsChanged();

                            me.processing(false);
                            uploadResults.forEach(function(uploadResult) {
                                me.addUploadToTotals(uploadResult);
                            });
                            me.next();
                        },
                        function(error) {
                            me.processing(false);
                            error.acknowledge();
                            me.errorMessage('Der opstod en fejl ved overførsel af poster. Prøv venligst igen senere.');
                        }
                    );
            }
        },

        complete: function(callback, abort) {
            this.goToNextStep(callback);
        }
    });
});
