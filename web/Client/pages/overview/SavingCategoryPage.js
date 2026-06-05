define(function(require) {
    var core = require('framework/core');
    var template = require('template!SavingCategoryPage');
    var overviewUtilities = require('./overviewUtilities');
    var config = require('config');
    var session = require('session');
    var categoryService = require('services/categoryService');
    var overviewService = require('services/overviewService');
    var joyRideService = require('services/joyRideService');
    var utilities = require('utilities/utilities');
    var charting = require('utilities/charting');
    var CategoryChart = require('./categoryChart/CategoryChart');
    var CategoryHistoryChart = require('./categoryHistoryChart/CategoryHistoryChart');
    var ExtraordinaryPostingsTooltip = require('components/extraordinary/ExtraordinaryPostingsTooltip');

        return core.StatePage.extend({
            template: template,

            title: 'Opsparing',

            navigationId: 'overview',

            routes: [
                { id: 'category-saving', url: '', action: 'showSaving' }
            ],

            amountMultiplier: -1,

            constructor: function () {
                this.subNavigation = overviewUtilities.getSubNavigation('category-saving');

                this.loading = ko.observable(false).extend({ throttle: 10 });

                this.comparisonCategoryId = ko.observable(null);
                this.comparisonCategories = ko.observableArray();

                this.historyChart = ko.observable();
                this.categoryChart = ko.observable();

                this.periods = overviewUtilities.getPeriodItems();
                this.currentPeriod = ko.observable(this.periods[0]);

                this.periodAverage = ko.observable(0);
                this.periodTotal = ko.observable(0);

                this.periodTotalsTitle = ko.computed(function() {
                    return this.currentPeriod().totalsTitle;
                }, this);

                this.getStateObject = function() {
                    return {
                        comparisonCategoryId: this.comparisonCategoryId() || null, // force null as empty value, instead of undefined (which Knockout's options binding sets)
                        currentPeriod: this.currentPeriod()
                    };
                };

                this.extraordinaryAmount = ko.observable();
                this.extraordinaryTooltip = new ExtraordinaryPostingsTooltip();

                this.currency = session.currency;

                this.base();
            },

            showSaving: function() {
                this.updateUI();
            },

            updateUI: function() {
                var me = this;

                this.loading(true);

                var startMonth = this.currentPeriod().startMonth;
                var endMonth = this.currentPeriod().endMonth;

                return overviewService.getSavingCategorySummary(startMonth, endMonth)
                    .then(function(result) {
                        me.loading(false);
                        me.disposeCharts();

                        var averageMonth = result.summary.averageMonth;
                        var numberOfMonths = averageMonth.numberOfMonths;

                        me.periodAverage(averageMonth.total);
                        me.periodTotal(averageMonth.total * numberOfMonths);

                        me.historyChart(new CategoryHistoryChart(result.summary, me.historyChartOnClick.bind(me), me.comparisonCategoryId(), me.amountMultiplier));
                        me.comparisonCategories(result.comparisonCategories);
                        me.categoryChart(new CategoryChart(result.summary, null, me.amountMultiplier));
                        me.extraordinaryAmount(result.summary.extraordinarySavings);

                        me.extraordinaryTooltip.update({
                            expenses: result.summary.extraordinaryExpenses,
                            income: result.summary.extraordinaryIncome,
                            saving: result.summary.extraordinarySavings,
                            startMonth: averageMonth.startMonth,
                            endMonth: averageMonth.endMonth
                        });
                    });
            },

            historyChartOnClick: function(event) {
                this.categoryChart().setMonth(event.point.x);
            },

            disposeCharts: function() {
                if (this.historyChart())
                    this.historyChart().dispose();
                if (this.categoryChart())
                    this.categoryChart().dispose();
            },

            dispose: function() {
                this.disposeCharts();
                this.extraordinaryTooltip.dispose();
            }
        });
    });
