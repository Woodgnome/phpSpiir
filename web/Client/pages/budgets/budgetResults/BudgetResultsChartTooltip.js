define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetResultsChartTooltip');
    var ChartTooltipBase = require('components/ChartTooltipBase');
    var session = require('session');

    var BudgetTypeItem = core.Base.extend({
        constructor: function(budgetType, title, currentPoint) {
            this.budgetType = budgetType;
            this.title = title;

            this.offBudget = ko.computed(function() {
                return currentPoint()[budgetType + 'Difference'] < 0;
            }, this);

            this.difference = ko.computed(function() {
                return currentPoint()[budgetType + 'Difference'];
            }, this);
        }
    });

    return ChartTooltipBase.extend({
        template: template,

        constructor: function(balancePoints, year) {
            this.balancePoints = balancePoints;
            this.point = ko.observable({ month: '' });

            this.isProjected = ko.computed(function() {
                return this.point().isProjected;
            }, this);

            this.budgetTypeItems = [
                new BudgetTypeItem('income', 'Indkomst', this.point),
                new BudgetTypeItem('bill', 'Regninger', this.point),
                new BudgetTypeItem('consumption', 'Forbrug', this.point),
                new BudgetTypeItem('result', 'Resultat', this.point)
            ];

            this.currency = session.currency;

            this.base();
        },

        update: function(chartPoint) {

            if (chartPoint.monthIndex < 0)
                return false;

            this.point(this.balancePoints[chartPoint.monthIndex]);
        }
    });
});
