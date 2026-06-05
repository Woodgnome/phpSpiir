define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetModalChart');
    var BudgetModalChartTooltip = require('./BudgetModalChartTooltip');
    var categoryService = require('services/categoryService');
    var utilities = require('utilities/utilities');
    var charting = require('utilities/charting');
    var when = require('lib/when');


    var ko = core.ko;

    function convertDataToPoints(yValues, xOffset) {
        return yValues.map(function(y, index) {
            return { x: xOffset + index, y: y, monthIndex: index };
        });
    }

    // Direct port from BudgetService (see tests of C# implementation)

    function calculateBudgetValuesForRolloverBudget(budgetted, realized, year) {
        var rolloverBudgetted = [];
        var transferred = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        var remaining = 0;

        for (var i = 0; i < 12; i++) {
            var isFutureMonth = new Date(year, i, 1).getTime() > new Date().getStartOfMonth().getTime();

            if (isFutureMonth) {
                rolloverBudgetted[i] = budgetted[i];
                if (remaining < 0) {
                    transferred[i] = remaining;

                    // Divide amount used over budget (the negative remaining amount) over future months:
                    var remainingToSubtractFromCurrentMonth = Math.min(-remaining, rolloverBudgetted[i]);
                    rolloverBudgetted[i] -= remainingToSubtractFromCurrentMonth;
                    remaining += remainingToSubtractFromCurrentMonth;
                }
            } else {
                transferred[i] = remaining;

                rolloverBudgetted[i] = budgetted[i] + remaining;

                remaining += budgetted[i] - realized[i];
            }
        }

        return {
            budgetted: rolloverBudgetted,
            transferred: transferred
        };
    }

    return core.Base.extend({
        template: template,

        constructor: function (budgetType, year, onMonthClick) {
            var me =this;

            this.budgetType = budgetType;

            this.tooltip = new BudgetModalChartTooltip(year);
            this.chartId = utilities.createUniqueId();

            this.rollover = ko.observable(false);
            this.realized = ko.observable([]);
            this.budgetted = ko.observable([]);

            this.onMonthClick = onMonthClick;

            this.budgettedChartValues = ko.computed(function() {
                var budgetted = this.budgetted(),
                    rolloverBudgetted = [],
                    shadowValues = [],
                    transferred = [];

                var chartValues;

                if (!this.rollover()) {
                    chartValues = [budgetted, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]];
                } else {
                    var budgetValues = calculateBudgetValuesForRolloverBudget(budgetted, this.realized(), year);
                    transferred = budgetValues.transferred;
                    rolloverBudgetted = budgetValues.budgetted;

                    for (var i = 0; i < 12; i++)
                        shadowValues[i] = Math.max(rolloverBudgetted[i], budgetted[i]);

                    var rolloverBudgettedWithoutNegativeBudgets = rolloverBudgetted.map(function (value) { return value > 0 ? value : 0; });
                    chartValues = [rolloverBudgettedWithoutNegativeBudgets, shadowValues];
                }

                this.tooltip.budgetted = budgetted;
                this.tooltip.rolloverBudgetted = rolloverBudgetted;
                this.tooltip.movedFromLastMonth = transferred;

                return chartValues;
            }, this);


            this.chartReady = when.defer();
            this.dataReady = when.defer();

            ko.computed(function() {
                if (this.realized().length > 0 && this.budgetted().length > 0)
                    this.dataReady.resolve();
            }, this);

            this.budgetPattern = ko.computed(function () {
                if (this.budgetType === 'bill' || this.budgetType === 'income')
                    return [];

                var budgetted = this.budgetted();

                var pattern = [{ changed: false, monthIndex: 0 }];
                for (var i = 1; i < budgetted.length; i++) {
                    pattern[i] = {
                        changed: budgetted[i] !== budgetted[i - 1],
                        monthIndex: i
                    };
                }

                return pattern;
            }, this);

            this.budgettedChartValues.subscribe(function(values) {
                this.updateSeries('budgetBase', convertDataToPoints(values[0], -.17));
                this.updateSeries('budgetShadow', convertDataToPoints(values[1], -.17));
            }, this);

            _.bindAll(this, 'onPatternClick');

            this.patternVisible = ko.observable(false);
            this.chartReady.then(function() {
                me.patternVisible(true);
            });

            this.render();
        },

        onPatternClick: function(p) {
            this.onMonthClick(p.monthIndex);
        },

        setRealized: function(realizedMonths) {
            if (this.hasRealized)
                throw new Error('setRealizedInfo can only be called once');

            this.hasRealized = true;

            this.tooltip.realized = realizedMonths;

            var realizedData = realizedMonths.map(function(r) { return r.amount; });
            this.realized(realizedData);
        },

        showStatisticLine: function(value) {
            var me = this;
            this.chartReady.then(function() {
                var axis = me.chart.yAxis[0];
                axis.removePlotLine('statisticLine');
                axis.addPlotLine({
                    id: 'statisticLine',
                    width: 1,
                    color: '#999',
                    value: value,
                    zIndex: 2,
                    dashStyle: 'dash'
                });
            });
        },

        setBudgetted: function(budgetted) {
            this.tooltip.budgetted = budgetted;
            this.budgetted(budgetted);
        },

        setRollover: function(rollover) {
            this.tooltip.rollover(rollover);
            this.rollover(rollover);
        },

        updateSeries: function(seriesId, points) {
            this.chartReady.then(function() {
                var series = this.chart.get(seriesId);
                var needsRedraw = false;

                var pointsByX = {};
                points.forEach(function(p) { pointsByX[p.x] = p; });

                for (var i = 0; i < series.data.length; i++) {
                    var seriesPoint = series.data[i];
                    var dataPoint = pointsByX[seriesPoint.x];
                    if (seriesPoint.y !== dataPoint.y) {
                        seriesPoint.update(dataPoint.y, false, true);
                        needsRedraw = true;
                    }
                }

                if (needsRedraw)
                    this.chart.redraw();
            }.bind(this));
        },

        render: function() {
            var me = this;

            me.dataReady.then(function() {
                var budgetValues = me.budgettedChartValues();
                var series = [
                    {
                        id: 'budgetShadow',
                        data: budgetValues.length > 1 ? convertDataToPoints(budgetValues[1], -.17) : [],
                        color: '#fff',
                        borderColor: '#cde3ff',
                        pointWidth: 16,
                    },
                    {
                        id: 'budgetBase',
                        data: convertDataToPoints(budgetValues[0], -.17),
                        color: charting.comparisonColor,
                        borderWidth: 1,
                    },
                    {
                        data: convertDataToPoints(me.realized(), .17),
                        color: me.budgetType === 'income' ? charting.incomeColor : charting.fixedExpenseColor
                    }
                ];

                _.defer(function() {
                    me.chart = new Highcharts.Chart(me.getStandardChartOptions(series));
                    me.chartReady.resolve(me.chart);
                });
            });
        },

        getStandardChartOptions: function(series) {
            var me = this;
            return {
                chart: {
                    defaultSeriesType: 'column',
                    marginTop: 5,
                    renderTo: this.chartId
                },
                xAxis: {
                    categories: utilities.language.shortMonthNames,
                    min: 0,
                    max: 11
                },
                plotOptions: {
                    series: {
                        animation: true,
                        point: {
                            events: {
                                click: function() {
                                    me.onMonthClick(this.monthIndex);
                                },
                                mouseOver: this.tooltip.handleMouseOver
                            }
                        },
                        events: {
                            mouseOut: this.tooltip.handleMouseOut
                        }
                    },
                    column: {
                        grouping: false,
                        pointWidth: 18
                    }
                },
                series: series,
                tooltip: {
                    enabled: false
                }
            };
        }
    });
});