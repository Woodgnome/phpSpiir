define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetModalChartTooltip');
    var ChartTooltipBase = require('components/ChartTooltipBase');
    var utilities = require('utilities/utilities');
    var session = require('session');

    return ChartTooltipBase.extend({
        template: template,

        constructor: function (year) {
            this.year = year;
            this.budget = ko.observable(0);
            this.fromLastMonth = ko.observable(0);
            this.rolloverBudget = ko.observable(0);

            this.lastMonthName = ko.observable();
            this.currentMonthName = ko.observable();

            this.postings = ko.observableArray();
            this.topPostings = ko.observableArray();
            this.morePostings = ko.observable(0);

            this.totalRealized = ko.computed(function() {
                return this.postings().sum(function(p) { return p.amount; });
            }, this);

            this.realized = [];
            this.budgetted = [];
            this.rolloverBudgetted = [];
            this.movedFromLastMonth = [];
            this.rollover = ko.observable(false);
            this.showRealized = ko.observable(true);

            this.currency = session.currency;

            this.base();
        },

        update: function(point) {
            var x = point.monthIndex;
            if (this.budgetted[x] === undefined || !this.realized)
                return false;

            var isFutureMonth = new Date(this.year, x, 1).getTime() > new Date().getTime();
            this.showRealized(!isFutureMonth);

            this.budget(this.budgetted[x]);
            this.rolloverBudget(this.rolloverBudgetted[x]);
            this.fromLastMonth(this.movedFromLastMonth[x]);

            this.currentMonthName(utilities.language.shortMonthNames[x]);
            this.lastMonthName(utilities.language.shortMonthNames[(11 + x) % 12]);

            var realizedForMonth = this.realized[x];
            var realizedPostings = realizedForMonth.postings || [];

            var postings = realizedPostings
                .map(function(p) {
                    return {
                        amount: p.amount,
                        date: Date.fromIsoDate(p.date),
                        description: p.description
                    };
                })
                .sortBy(function(p) { return -p.amount; });

            this.postings(postings);

            var numberOfPostings = 3;

            this.topPostings(postings.slice(0, numberOfPostings));
            this.morePostings(Math.max(0, postings.length - numberOfPostings));
        }
    });
});
