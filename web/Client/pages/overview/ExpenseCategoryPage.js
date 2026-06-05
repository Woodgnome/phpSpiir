define(function(require) {
    var core = require('framework/core');
    var template = require('template!ExpenseCategoryPage');
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


        var categoryIdUrlMap = {
            forbrug: 'Consumption',
            regninger: 'Bill'
        };

        var reverseCategoryIdUrlMap = {};
        _.each(categoryIdUrlMap, function(v, k) { reverseCategoryIdUrlMap[v] = k; });

        return core.StatePage.extend({
            template: template,

            title: 'Udgifter',

            navigationId: 'overview',

            routes: [
                { id: 'category-expenses-all', url: '', action: 'showAllExpenses' },
                { id: 'category-expenses-single', url: '{categoryId}', action: 'showExpensesForCategory' }
            ],

            constructor: function() {
                this.subNavigation = overviewUtilities.getSubNavigation('category-expenses-all');

                this.loading = ko.observable(false).extend({ throttle: 10 });

                this.categoryId = ko.observable();
                this.categories = session.categories.filter(function (c) { return c.categoryType === 'Expense'; });
                this.categories.unshift({ id: 'Bill', name: 'Regninger' });
                this.categories.unshift({ id: 'Consumption', name: 'Forbrug' });

                this.comparisonCategoryId = ko.observable();
                this.comparisonCategories = ko.observableArray();

                this.historyChart = ko.observable();
                this.categoryChart = ko.observable();

                this.periods = overviewUtilities.getPeriodItems();
                this.currentPeriod = ko.observable(this.periods[0]);

                this.periodAverage = ko.observable(0);
                this.periodTotal = ko.observable(0);

                this.sidebarTitle = ko.computed(function() {
                    if (this.categoryId())
                        return categoryService.getCategoryNameById(this.categoryId());

                    return 'Alle udgifter';
                }, this);

                this.periodTotalsTitle = ko.computed(function() {
                    return this.currentPeriod().totalsTitle;
                }, this);

                this.getStateObject = function() {
                    return {
                        comparisonCategoryId: this.comparisonCategoryId() || null, // force null as empty value, instead of undefined (which Knockout's options binding sets)
                        currentPeriod: this.currentPeriod(),
                        categoryId: this.categoryId() || null
                    };
                };

                this.extraordinaryAmount = ko.observable();
                this.extraordinaryTooltip = new ExtraordinaryPostingsTooltip();

                this.currency = session.currency;

                this.base();
            },

            showAllExpenses: function() {
                this.setState({
                    categoryId: null,
                    comparisonCategoryId: null
                }, true);
            },

            showExpensesForCategory: function(options) {
                var period = this.periods.find(function(p) { return p.startMonth === options.startMonth && p.endMonth === options.endMonth; })

                this.setState({
                    currentPeriod: period || this.currentPeriod(),
                    categoryId: categoryIdUrlMap[options.categoryId] || options.categoryId,
                    comparisonCategoryId: null
                }, true);
            },

            updateUrlToMatchState: function(newState) {
                // TODO consider replacing URL instead of assigning, to simplify browser history
                if (newState.categoryId)
                    this.app.navigate('category-expenses-single', { categoryId: reverseCategoryIdUrlMap[newState.categoryId] || newState.categoryId });
                else
                    this.app.navigate('category-expenses-all');
            },

            updateUI: function() {
                var me = this;

                this.loading(true);

                var startMonth = this.currentPeriod().startMonth;
                var endMonth = this.currentPeriod().endMonth;

                return overviewService.getExpenseCategorySummary(this.categoryId(), startMonth, endMonth)
                    .then(function(result) {
                        me.loading(false);
                        me.disposeCharts();

                        var averageMonth = result.summary.averageMonth;
                        var numberOfMonths = averageMonth.numberOfMonths;

                        me.periodAverage(averageMonth.total);
                        me.periodTotal(averageMonth.total * numberOfMonths);

                        me.historyChart(new CategoryHistoryChart(result.summary, me.historyChartOnClick.bind(me), me.comparisonCategoryId()));
                        me.comparisonCategories(result.comparisonCategories);
                        me.categoryChart(new CategoryChart(result.summary));
                        me.extraordinaryAmount(result.summary.extraordinaryExpenses);

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
