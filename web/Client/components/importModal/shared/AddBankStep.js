define(function(require) {
    var core = require('framework/core');
    var template = require('template!AddBankStep');
    var Step = require('components/wizard/Step');
    var mobileBankApiService = require('services/mobileBankApiService');
    var FileStep = require('../manual/FileStep');
    var PartnerInfoStep = require('./PartnerInfoStep');
    var BankFinder = require('components/bankFinder/BankFinder');
    var ExternalAuthProviderStep = require('../automatic/ExternalAuthProviderStep');

        return Step.extend({
            showActions: false,

            template: template,

            constructor: function () {
                var me = this;
                this.base.apply(this, arguments);

                this.bankFinder = this.registerDisposable(new BankFinder('singleClickBankFinder', true));
                this.bankFinder.on('selectBank', function(bank) {
                    me.wizardState.bank = bank;
                    me.next();
                });
            },

            complete: function (callback, abort) {
	            var bank = this.wizardState.bank;

	            if (bank.isPartnerBank) {
		            this.wizard.addStep(PartnerInfoStep);
                } else if (mobileBankApiService.isAutomaticBank(bank)) {
                    this.wizard.addStep(ExternalAuthProviderStep);
	            } else {
		            this.wizard.addStep(FileStep);
	            }

	            callback();
            }
        });
    });