define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetResults');
    var utilities = require('utilities/utilities');
    var BudgetResultsChartTooltip = require('./BudgetResultsChartTooltip');
    var charting = require('utilities/charting');
    var session = require('session');


    var budgetTypeTitles = {
        income: 'Indkomst',
        bill: 'Regninger',
        consumption: 'Forbrug'
    };

    var BudgetTypeBox = core.Base.extend({
        constructor: function(budgetTypeBalance) {
            var budgetType = budgetTypeBalance.budgetType.camelCase();

            this.title = budgetTypeTitles[budgetType];
            this.realized = budgetTypeBalance.realized;
            this.budget = budgetTypeBalance.budget;
            this.difference = budgetTypeBalance.difference;

            this.offBudget = budgetTypeBalance.difference < 0;

            if (budgetType === 'income')
                this.description = this.offBudget ? 'mindre end planlagt' : 'mere end planlagt';
            else
                this.description = this.offBudget ? 'mere end planlagt' : 'mindre end planlagt';
        }
    });

    return core.Base.extend({
        template: template,

        constructor: function(result, year) {
            this.tooltip = new BudgetResultsChartTooltip(result.balancePoints, year);

            var today = new Date();
            this.startMonth = new Date(today.getFullYear(), 0, 1).toMonthString();
            this.lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toMonthString();

            this.budgetTypeBoxes = result.budgetTypeBalances.map(function(btb) { return new BudgetTypeBox(btb); });

            this.balancePoints = result.balancePoints;

            this.showEndOfYearBalance = year > new Date().getFullYear() || (year === new Date().getFullYear() && new Date().getMonth() === 0);

            this.statusPeriod = this.showEndOfYearBalance
                ? year
                : utilities.formatMonth('%B', result.statusBalancePoint.month);

            this.statusBalance = this.showEndOfYearBalance ? result.statusBalancePoint.budgetBalance : result.statusBalancePoint.realizedBalance;
            this.showExtraordinaryBalance = this.showEndOfYearBalance ? false : result.statusBalancePoint.extraordinaryBalance !== result.statusBalancePoint.realizedBalance;
            this.extraordinaryBalance = result.statusBalancePoint.extraordinaryBalance;

            this.statusDifference = result.statusBalancePoint.realizedBalance - result.statusBalancePoint.budgetBalance;

            this.balanceChart = this.getBalanceHistoryChartOptions(result.balancePoints);

            this.currency = session.currency;
        },

        getBalanceHistoryChartOptions: function(balancePoints) {
            var firstProjectedPoint = null;
            for (var i = 0; i < balancePoints.length; i++) {
                if (balancePoints[i].isProjected) {
                    firstProjectedPoint = i;
                    break;
                }
            }

            var series = [
                {
                    data: [{ x: -0.5, y: balancePoints[0].realizedBalance === null ? null : 0, monthIndex: -1 }]
                        .concat(balancePoints.map(function(p, i) { return { x: i + 0.5, y: p.isProjected ? null : p.realizedBalance, monthIndex: i }; })),
                    name: 'Realiseret saldo',
                    lineWidth: 2,
                    shadow: false
                },
                {
                    data: [{ x: -0.5, y: 0, monthIndex: -1 }]
                        .concat(balancePoints.map(function(p, i) { return { x: i + 0.5, y: p.budgetBalance, monthIndex: i }; })),
                    name: 'Budgetsaldo',
                    lineWidth: 2,
                    shadow: false
                },
                {
                    data: [{ x: -0.5, y: balancePoints[0].projectedBalance === null ? null : 0, monthIndex: -1 }]
                        .concat(balancePoints.map(function(p, i) {
                            var projectedPoint = {
                                x: i + 0.5,
                                y: firstProjectedPoint !== null && i >= firstProjectedPoint - 1 ? p.realizedBalance : null,
                                monthIndex: i
                            };
                            if (i === firstProjectedPoint - 1)
                                projectedPoint.marker = { enabled: false };

                            return projectedPoint;
                        })),
                    color: '#ccc',
                    name: 'Prognose',
                    dashStyle: 'LongDash',
                    lineWidth: 1,
                    shadow: false
                }
            ];

            return {
                chart: {
                    defaultSeriesType: 'spline',
                    marginTop: 5,
                    spacingBottom: 0,
                    marginBottom: 70
                },
                xAxis: {
                    min: -0.1,
                    categories: utilities.language.shortMonthNames
                },
                yAxis: {
                    plotLines: [{
                        value: 0,
                        color: '#ccc',
                        width: 2
                    }]
                },
                plotOptions: {
                    series: {
                        animation: true,
                        marker: {
                            symbol: 'circle'
                        },
                        point: {
                            events: {
                                mouseOver: this.tooltip.handleMouseOver
                            }
                        },
                        events: {
                            mouseOut: this.tooltip.handleMouseOut
                        }
                    }
                },
                legend: {
                    enabled: false
                },
                series: series,
                tooltip: {
                    enabled: false
                }
            };
        }
    });
});
