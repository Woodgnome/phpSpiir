define(function(require) {
    var core = require('framework/core');
    var template = require('template!ImportCompleteStep');
    var Step = require('components/wizard/Step');


    return Step.extend({
        template: template,

        showActions: false,
        canGoBack: false,
        
        constructor: function() {
            this.base.apply(this, arguments);

            this.assertInWizardState('bank', 'uploadTotals');

            this.bank = this.wizardState.bank;
            this.uploadTotals = this.wizardState.uploadTotals;
            this.newPostings = ko.observable(this.uploadTotals.newPostings);
            this.categorizedPostings = ko.observable(this.uploadTotals.categorizedPostings);
        },

        complete: function(callback, abort) {
            callback();
        },
        
        close: function() {
            this.next();
        },
        
        goToOverview: function() {
            this.next();
            core.Application.instance.navigate('overview-index', null, true);
        },
        
        goToPostings: function () {
            this.next();
            core.Application.instance.navigate('server:Posting_Index', null, true);
        }
    });
});
