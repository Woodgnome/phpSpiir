define(function(require) {
    var core = require('framework/core');
    var template = require('template!CategoryChart');
    var charting = require('utilities/charting');
    var utilities = require('utilities/utilities');
    var config = require('config');
    var session = require('session');
    var CategoryChartTooltip = require('./CategoryChartTooltip');
    var categoryService = require('services/categoryService');


    var ko = core.ko;

    function getCategoryBarChartOptions(options) {
        options = _.extend({
            data: [],
            onclick: function() {
            },
            animate: false,
            color: charting.expenseColor
        }, options);

        var categories = _.pluck(options.data, 'name');

        var chartOptions = {
            chart: {
                defaultSeriesType: 'bar',
                marginLeft: 10,
                marginRight: 40,
                height: options.data.length * 45 + 20
            },

            xAxis: {
                categories: categories,
                tickInterval: 1,
                maxPadding: 0.1,
                minPadding: 0.1,
                labels: {
                    align: 'left',
                    y: -14,
                    x: 0,
                    style: { color: '#3f3f3f' }
                },
                lineColor: '#fff',
                tickWidth: 0
            },
            yAxis: {
                min: 0
            },
            plotOptions: {
                series: {
                    animation: options.animate,
                    events: {
                        click: options.onClick,
                        mouseOut: options.tooltip.handleMouseOut
                    },
                    point: {
                        events: {
                            mouseOver: options.tooltip.handleMouseOver
                        }
                    }
                },
                bar: {
                    dataLabels: {
                        enabled: true,
                        formatter: function() {
                            if (this.y === 0)
                                return '';

                            if (this.point.isPositive)
                                return '(' + utilities.formatPrice(-1 * this.y) + ' ' + session.currency.symbol + ')';

                            return utilities.formatPrice(this.y) + ' ' + session.currency.symbol;
                        },
                        x: 2,
                        y: Highcharts.Renderer === Highcharts.VMLRenderer ? 8 : 5,
                        style: { fontSize: '14px', color: '#3f3f3f' }
                    },
                    pointWidth: 20
                }
            },
            tooltip: { enabled: false },
            series: [{
                data: options.data,
                color: options.color
            }]
        };

        return chartOptions;
    }

    return core.Base.extend({
        template: template,

        constructor: function(summary, onClick, amountMultiplier) {
            this.currentMonth = ko.observable();
            this.chart = ko.observable();

            this.animate = false;
            this.amountMultiplier = amountMultiplier || 1;
            this.onClick = onClick || function() {
            };

            this.reportType = summary.reportType;
            this.monthReports = summary.months.concat([summary.averageMonth]);
            this.averageMonth = summary.averageMonth;

            this.title = this.getTitle(this.reportType);

            summary.averageMonth.shortMonthWithYear = "Gnm.snit";
            summary.averageMonth.isAverage = true;

            this.currentMonth.subscribe(this.renderChart, this);
            this.startMonth = summary.averageMonth.startMonth;
            this.endMonth = summary.averageMonth.endMonth;

            this.tooltip = new CategoryChartTooltip();

            this.currentMonth(summary.averageMonth);
        },

        setMonth: function(x) {
            this.currentMonth(this.monthReports[x]);
        },

        renderChart: function() {
            var me = this;
            var month = this.currentMonth();

            var categoryData = month.categories.map(function(c) {
                var averageCategory = me.averageMonth.categories.find(function(ec) {
                    return ec.categoryId === c.categoryId;
                });
                var amount = me.amountMultiplier * c.amount;

                var postingPageParameters = me.getPostingPageParameters(month, c.categoryId);

                var point = {
                    y: Math.abs(amount),
                    name: c.categoryName,
                    categoryId: c.categoryId,
                    month: month,
                    topPostings: c.topPostings,
                    averageAmount: averageCategory ? Math.abs(averageCategory.amount) : 0,
                    comparisonAverage: c.comparisonAverage,
                    reportType: me.reportType,
                    postingPageParameters: postingPageParameters
                };

                if (amount < 0) {
                    point.color = me.getPredictedColor(me.reportType);
                    point.isPositive = true;
                }
                return point;
            });

            var chartOptions = getCategoryBarChartOptions({
                data: categoryData,
                onClick: function(event) {
                    me.onClick({
                        categoryId: event.point.categoryId,
                        month: me.currentMonth().month,
                        startMonth: me.startMonth,
                        endMonth: me.endMonth
                    });
                },
                color: this.getColor(this.reportType),
                animate: this.animate,
                tooltip: this.tooltip
            });

            this.chart(chartOptions);

            this.animate = true;
        },

        dispose: function() {
            this.tooltip.dispose();
        },

        getPostingPageParameters: function(month, categoryId) {
            var params = {};
            if (categoryId === '-1')
                params.categorizationStatus = 'Uncategorized';
            else if (categoryService.isMainCategoryId(categoryId))
                params.categoryIds = categoryId;
            else
                params.subcategoryIds = categoryId;

            if (month.isAverage) {
                params.fromMonth = this.startMonth;
                params.toMonth = this.endMonth;
            } else {
                params.fromMonth = month.month;
                params.toMonth = month.month;
            }
            return params;
        },

        getTitle: function(reportType) {
            if (reportType === 'Income')
                return 'Hvor kommer min indkomst fra?';

            if (reportType === 'Saving')
                return 'Hvordan er min opsparing fordelt?';

            return 'Hvad har jeg brugt mine penge på?';
        },

        getColor: function(reportType) {
            if (reportType === 'Income')
                return charting.incomeColor;

            if (reportType === 'Saving')
                return charting.savingColor;

            return charting.expenseColor;
        },

        getPredictedColor: function(reportType) {
            if (reportType === 'Income')
                return charting.predictedIncomeColor;

            if (reportType === 'Saving')
                return charting.predictedSavingColor;

            return charting.predictedExpenseColor;
        },
    });
});
