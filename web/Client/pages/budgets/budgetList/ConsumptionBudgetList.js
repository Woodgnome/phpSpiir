define(function(require) {
    var core = require('framework/core');
    var template = require('template!ConsumptionBudgetList');
    var categoryService = require('services/categoryService');
    var ConsumptionBudgetListRow = require('./ConsumptionBudgetListRow');
    var BudgetListRow = require('./BudgetListRow');
    var BudgetModal = require('../budgetModal/BudgetModal');


    return core.Base.extend({
        template: template,

        constructor: function(consumptionBudgetSummary, budgetType, year) {
            var me = this;

            this.isCurrentYear = year === new Date().getFullYear();
            this.rowClass = this.isCurrentYear ? ConsumptionBudgetListRow : BudgetListRow;

            this.year = year;
            this.consumptionLimit = new this.rowClass('consumptionLimit', year, consumptionBudgetSummary.consumptionLimit);
            this.budgets = consumptionBudgetSummary.consumptionBudgets
                .map(function(cb) { return new me.rowClass('consumption', year, cb); });
            consumptionBudgetSummary.consumptionRest.clickBehaviour = 'expand';
            this.consumptionRest = new this.rowClass('consumptionRest', year, consumptionBudgetSummary.consumptionRest);
        }
    });
});