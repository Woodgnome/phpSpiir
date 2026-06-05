define(function(require) {
    var core = require('framework/core');
    var Step = require('components/wizard/Step');
    var ImportCompleteStep = require('./ImportCompleteStep');


    var UploadTotals = core.Base.extend({
        constructor: function() {
            this.newPostings = 0;
            this.categorizedPostings = 0;
        },

        addUpload: function(uploadResult) {
            this.newPostings += uploadResult.newPostings;
            this.categorizedPostings += uploadResult.categorizedPostings;
        }
    });

    return Step.extend({
        constructor: function() {
            this.base.apply(this, arguments);
            this.uploadTotals = new UploadTotals();
            
            this.bank = this.wizardState.bank;
            if (!this.bank)
                throw new Error('MobileBankSyncStep requires a bank.');
        },

        complete: function(callback, abort) {
            callback();
        },

        addUploadToTotals: function(uploadResult) {
            this.uploadTotals.addUpload(uploadResult);
        },

        goToNextStep: function(callback) {
            this.wizardState.uploadTotals = this.uploadTotals;
            this.wizard.addStep(ImportCompleteStep);
            callback();
        }
    });
});