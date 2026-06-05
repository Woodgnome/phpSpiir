define(function(require) {
    var core = require('framework/core');
    var template = require('template!OverviewPage');
    var config = require('config');
    var session = require('session');
    var overviewService = require('services/overviewService');
    var joyRideService = require('services/joyRideService');
    var charting = require('utilities/charting');
    var CategoryChart = require('./categoryChart/CategoryChart');
    var IncomeExpenseChartTooltip = require('./IncomeExpenseChartTooltip');
    var WelcomeToSpiirJoyRide = require('./WelcomeToSpiirJoyRide');
    var overviewUtilities = require('./overviewUtilities');
    var ExtraordinaryPostingsTooltip = require('components/extraordinary/ExtraordinaryPostingsTooltip');


        function getIncomeExpenseChartOptions(incomeExpenseSummary, onClick, tooltip) {
            var months = incomeExpenseSummary.months;
            var averages = incomeExpenseSummary.averageMonth;

            var income = months.map(function(m) { return { y: m.income }; });
            var expenses = months.map(function(m) { return { y: m.variableExpenses + m.fixedExpenses }; });
            var netto = months.map(function(m) { return { y: m.result }; });

            var plotLines = [];

            // Dim partial month at the start
            if (averages.startMonth > months[0].month) {
                var indexOfFirstFullMonth = 0;
                for (var i = 0; i < months.length; i++) {
                    if (averages.startMonth <= months[i].month) {
                        indexOfFirstFullMonth = i;
                        break;
                    }
                }

                plotLines.push({ color: '#eee', value: indexOfFirstFullMonth - .5, width: 1 });

                if (indexOfFirstFullMonth > 0) {
                    expenses[indexOfFirstFullMonth - 1].color = charting.predictedExpenseColor;
                    income[indexOfFirstFullMonth - 1].color = charting.predictedIncomeColor;
                }
            }

            // Dim the current month
            if (averages.endMonth < months[months.length - 1].month) {
                var indexOfFirstFutureMonth = 0;
                for (var i = 0; i < months.length; i++) {
                    if (averages.endMonth < months[i].month) {
                        indexOfFirstFutureMonth = i;
                        break;
                    }
                }

                expenses[indexOfFirstFutureMonth].color = charting.predictedExpenseColor;
                income[indexOfFirstFutureMonth].color = charting.predictedIncomeColor;

                plotLines.push({ color: '#eee', value: indexOfFirstFutureMonth - 0.5, width: 1 });
            }

            var xAxisLabels = _.pluck(months, 'shortMonth');

            var options = {
                plotOptions: {
                    series: {
                        events: {
                            click: onClick,
                            mouseOut: tooltip.handleMouseOut
                        },
                        stickyTracking: false,
                        point: {
                            events: {
                                mouseOver: tooltip.handleMouseOver
                            }
                        }
                    },
                    column: {
                        stacking: 'normal',
                        pointWidth: 30
                    },
                    line: {
                        marker: {
                            symbol: 'circle',
                            fillColor: '#fff',
                            lineColor: '#333',
                            lineWidth: 2
                        }
                    }
                },
                xAxis: {
                    categories: xAxisLabels,
                    plotLines: plotLines
                },
                yAxis: {
                    endOnTick: false,
                    startOnTick: false
                },
                tooltip: {
                    enabled: false
                },
                series: [
                    { id: 'income', data: income, type: 'column', color: '#09ab58' },
                    { id: 'expenses', data: expenses, type: 'column', color: '#ff9800' },
                    { id: 'netto', data: netto, type: 'line', color: '#333' }
                ]
            };

            return options;
        }

        return core.Page.extend({
            template: template,

            title: 'Overblik',

            navigationId: 'overview',

            routes: [
                { id: 'overview-index', url: '', action: 'showOverview' }
            ],

            constructor: function() {
                this.subNavigation = overviewUtilities.getSubNavigation('overview-index');

                this.hasPostings = ko.observable(session.user.hasPostings);
                this.loading = ko.observable(false).extend({ throttle: 10 });
                this.joyRideClass = WelcomeToSpiirJoyRide;

                this.incomeExpenseChart = ko.observable();
                this.categoryChart = ko.observable();

                this.periods = overviewUtilities.getPeriodItems();
                this.currentPeriod = ko.observable(this.periods[0]);

                this.currentPeriod.subscribe(this.updateUI.bind(this));
                this.averageMonthResult = ko.observable();

                this.incomeExpenseTooltip = new IncomeExpenseChartTooltip();

                this.periodTotalsTitle = ko.computed(function() {
                    return this.currentPeriod().totalsTitle;
                }, this);

                this.periodTotals = ko.observable({ });

                this.resultWithExtraordinary = ko.observable();
                this.showExtraordinaryResult = ko.observable(false);
                this.extraordinaryTooltip = new ExtraordinaryPostingsTooltip();

                this.currency = session.currency;

                this.base();
            },

            showOverview: function() {
                if (this.hasPostings())
                    this.updateUI();
                else
                    this.beginJoyRideIfNotSeen();
            },

            updateUI: function() {
                var me = this;

                this.loading(true);

                var startMonth = this.currentPeriod().startMonth;
                var endMonth = this.currentPeriod().endMonth;

                return overviewService.getIncomeExpenseSummary(startMonth, endMonth)
                    .then(function(summary) {
                        me.loading(false);

                        var averageMonth = summary.averageMonth;
                        var numberOfMonths = averageMonth.numberOfMonths;

                        me.averageMonthResult(averageMonth.result);

                        me.periodTotals({
                            income: averageMonth.income * numberOfMonths,
                            bills: averageMonth.fixedExpenses * numberOfMonths,
                            consumption: averageMonth.variableExpenses * numberOfMonths,
                            savings: averageMonth.savings * numberOfMonths,
                            result: averageMonth.result * numberOfMonths,
                            resultWithSaving: averageMonth.resultWithSavings * numberOfMonths
                        });

                        me.incomeExpenseTooltip.setIncomeExpenseSummary(summary);
                        me.incomeExpenseChart(getIncomeExpenseChartOptions(summary, me.incomeExpenseChartOnClick.bind(me), me.incomeExpenseTooltip));
                        me.categoryChart(new CategoryChart(summary, me.categoryChartOnClick.bind(me), -1));

                        me.resultWithExtraordinary(me.periodTotals().result + summary.extraordinaryIncome + summary.extraordinaryExpenses);
                        me.showExtraordinaryResult(summary.extraordinaryIncome !== 0 || summary.extraordinaryExpenses !== 0);

                        me.extraordinaryTooltip.update({
                            income: summary.extraordinaryIncome,
                            expenses: summary.extraordinaryExpenses,
                            saving: summary.extraordinarySavings,
                            startMonth: averageMonth.startMonth,
                            endMonth: averageMonth.endMonth
                        });

                        me.beginJoyRideIfNotSeen();
                    });
            },

            incomeExpenseChartOnClick: function(event) {
                this.categoryChart().setMonth(event.point.x);
            },

            categoryChartOnClick: function(options) {
                if (options.categoryId === '-1') {
                    var params = { categorizationStatus: 'Uncategorized' };
                    if (options.month) {
                        params.fromMonth = options.month;
                        params.toMonth = options.month;
                    } else {
                        params.fromMonth = options.startMonth;
                        params.toMonth = Date.fromMonth(options.endMonth).addMonths(-1).toMonthString();
                    }
                    location.assign(config.urls.postings + '?' + $.param(params));
                } else {
                    if (!options.month) delete options.month;
                    this.navigate('category-expenses-single', options, { trigger: true });
                }
            },

            dispose: function() {
                this.incomeExpenseTooltip.dispose();
                this.extraordinaryTooltip.dispose();
                if (this.categoryChart())
                    this.categoryChart().dispose();
            },

            beginJoyRideIfNotSeen: function() {
                var me = this;
                if (joyRideService.hasUserSeenJoyRide('WelcomeToSpiirJoyRide'))
                    return;

                core.Application.instance.addModalTask(function(callback) {
                    _.defer(function() {
                        new me.joyRideClass(callback).begin();
                    });
                });
            }
        });
    });
