define(function(require) {
    var core = require('framework/core');
    var template = require('template!IncomeExpenseChartTooltip');
    var ChartTooltipBase = require('components/ChartTooltipBase');
    var session = require('session');

    var Item = core.Base.extend({
        constructor: function(key, title, currentPoint, amountMultiplier) {
            this.currency = session.currency;

            this.title = title;
            var averageKey = 'average' + key.capitalize();

            this.amount = ko.computed(function() {
                return amountMultiplier * currentPoint()[key];
            }, this);

            this.worseThanAverage = ko.computed(function() {
                var point = currentPoint();
                return point[key] - point[averageKey] < 0;
            }, this);
        }
    });

    return ChartTooltipBase.extend({
        template: template,

        constructor: function() {
            this.point = ko.observable({ month:''});
            this.currency = session.currency;

            this.items = [
                new Item('income', 'Indkomst', this.point, 1),
                new Item('bills', 'Regninger', this.point, -1),
                new Item('consumption', 'Forbrug', this.point, -1)
            ];

            this.result = ko.computed(function() {
                return this.point().result;
            }, this);

            this.month = ko.computed(function() {
                return this.point().month;
            }, this);

            this.base({ pinToSeries: 2 });
            },

        setIncomeExpenseSummary: function(summary) {
            this.incomeExpenseSummary = summary;
        },

        update: function(chartPoint) {
            var month = this.incomeExpenseSummary.months[chartPoint.x];
            var averageMonth = this.incomeExpenseSummary.averageMonth;

            var data = {
                income: month.income,
                averageIncome: averageMonth.income,
                bills: month.fixedExpenses,
                averageBills: averageMonth.fixedExpenses,
                consumption: month.variableExpenses,
                averageConsumption: averageMonth.variableExpenses,
                result: month.result,
                month: month.month
            };

            this.point(data);
        }
    });
});
