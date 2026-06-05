define(function(require) {
    var core = require('framework/core');
    var template = require('template!YearPicker');
    var utilities = require('utilities/utilities');
    var budgetService = require('services/budgetService');


    var ko = core.ko;

    return core.Component.extend({
        template: template,

        constructor: function(options) {
            var today = new Date();

            this.year = ko.observable(today.getFullYear());
            this.firstYear = ko.observable(today.getFullYear());
            this.lastYear = ko.observable(today.getFullYear() + 1);

            this.subscribeToHubMessage('budgetsChanged', this.updateUI.bind(this));

            this.updateUI();

            this.hasPreviousYear = ko.computed(function() {
                return this.year() > this.firstYear();
            }, this);

            this.hasNextYear = ko.computed(function() {
                return this.year() < this.lastYear();
            }, this);

            this.onYearChange = options.onYearChange;
        },

        updateUI: function() {
            var me = this;
            budgetService.getBudgetSummaryForYear(this.year()).then(function(budgetSummary) {
                if (!budgetSummary)
                    return;

                me.firstYear(budgetSummary.firstYearWithBudgets);
                me.lastYear(budgetSummary.lastYearWithBudgets);
            });
        },

        previousYear: function() {
            if (!this.hasPreviousYear())
                return;

            this.year(this.year() - 1);
            this.onYearChange(this.year());
        },
        
        nextYear: function() {
            if (!this.hasNextYear())
                return;
            
            this.year(this.year() + 1);
            this.onYearChange(this.year());            
        },

        changeState: function(state) {
            this.year(state.year);
        }
    });
});