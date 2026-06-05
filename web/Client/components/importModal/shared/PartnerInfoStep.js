define(function(require) {
    var core = require('framework/core');
    var template = require('template!PartnerInfoStep');
    var Step = require('components/wizard/Step');
    var FileStep = require('../manual/FileStep');
    var ExternalAuthProviderStep = require('../automatic/ExternalAuthProviderStep');
    var accountService = require('services/accountService');

    return Step.extend({
        template: template,
        
        nextLabel: 'Luk',

        constructor: function() {
            this.base.apply(this, arguments);

            this.loading = ko.observable(false);
        },

        activateNewIntegration: function () {
            var me = this;

            me.loading(true);

            accountService.enableNewLsbIntegration().then(function() {
                accountService.getBank('DK_LaanOgSpar').then(
                    function (bank) {
                        me.loading(false);

                        if (!bank)
                            return;

                        me.wizardState.bank = bank;
                        me.wizard.replaceCurrentStep(ExternalAuthProviderStep);
                    }, function() {
                        me.loading(false);
                    });
            });
        },
        
        goToManualImport: function() {
            this.wizard.replaceStepsAndRestart([FileStep]);
        },
    });
});
