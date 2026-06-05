define(function(require) {
    var core = require('framework/core');
    var template = require('template!CategoryHistoryChart');
    var categoryService = require('services/categoryService');
    var utilities = require('utilities/utilities');
    var charting = require('utilities/charting');
    var CategoryHistoryChartTooltip = require('./CategoryHistoryChartTooltip');



    var styles = {
        consumption: {
            color: '#ff9800',
            fillColor: {
                linearGradient: [0, 0, 0, 250],
                //stops: [[0, '#fd5e00'], [1, '#ffb671']]
                stops: [[0, 'rgba(255, 152, 0, 0.5)'], [0.9, 'rgba(255, 152, 0, 0.1)']]
            },
            marker: {
                symbol: 'circle',
                fillColor: '#ff9800'
            }
        },
        income: {
            color: '#09ab58',
            fillColor: {
                linearGradient: [0, 0, 0, 250],
                stops: [[0, 'rgba(9, 171, 88, 0.5)'], [0.9, 'rgba(9, 171, 88, 0.1)']]
            },
            marker: {
                symbol: 'circle',
                fillColor: '#09ab58'
            }
        },
        comparison: {
            color: '#4880EB',
            fillColor: {
                linearGradient: [0, 0, 0, 250],
                stops: [[0, '#4880EB'], [1, '#84c6ff']]
            },
            marker: {
                symbol: 'circle',
                fillColor: '#4880EB'
            }
        },
        saving: {
            color: '#e17db1',
            fillColor: {
                linearGradient: [0, 0, 0, 250],
                stops: [[0, 'rgba(255, 125, 177, 0.5)'], [0.9, 'rgba(255, 125, 177, 0.1)']]
            },
            marker: {
                symbol: 'circle',
                fillColor: '#e17db1'
            }
        },
    };

    function getPrimaryCategoryData(summary, amountMultiplier) {
        var points = summary.months.map(function(monthReport) {
            return {
                y: monthReport.total * amountMultiplier,
                month: monthReport.month
            };
        });

        return {
            values: points,
            average: summary.averageMonth.total * amountMultiplier
        };
    }

    function getAmountForCategory(monthReport, categoryId) {
        var categoryData = monthReport.categories.find(function(c) { return c.categoryId == categoryId; });

        return categoryData ? categoryData.amount : 0;
    }

    function getSecondaryCategoryData(summary, categoryId, amountMultiplier) {
        var points = summary.months.map(function(monthReport) {
            return {
                y: getAmountForCategory(monthReport, categoryId) * amountMultiplier,
                month: monthReport.month,
                categoryId: categoryId
            };
        });

        return {
            values: points,
            average: getAmountForCategory(summary.averageMonth, categoryId) * amountMultiplier
        };
    }

    function getXAxisLabels(summary) {
        return summary.months.map(function(r) {
            return utilities.formatMonth("%b", r.month);
        });
    }

    function getHistoryChart(summary, series, tooltip, onClick, animate) {
        var maxX = series[0].data.length;
        var maxY = _.max(_.pluck(series[0].data, 'y')); //, function(point) { return point.y });

        var plotLines = [
//            { color: '#ddd', value: summary.averageMonth.Total, width: 2, label: { text: 'Gnm.snit' } }
        ];

//        var comparisonCategoryAverage = 0;

//        if (comparisonCategoryId) {
//            var comparisonCategoryFromAverageMonth = summary.averageMonth.categories.find(function(c) { return c.categoryId == comparisonCategoryId; });
//            comparisonCategoryAverage = comparisonCategoryFromAverageMonth ? comparisonCategoryFromAverageMonth.amount : 0;

//            if (comparisonCategoryAverage > 0) {
//                var plotLineY = comparisonCategoryAverage / summary.averageMonth.total > 0.7 ? 15 : 0;
//                plotLines.push({ color: '#ddd', value: comparisonCategoryAverage, width: 2, label: { text: comparisonCategoryFromAverageMonth.categoryName + ' gnm.snit', y: plotLineY } });
//            }
//        }

        var plotBands = [];

        // Dim partial month at the start
        if (summary.averageMonth.startMonth > series[0].data[0].month) {
            var indexOfFirstFullMonth = 0;
            for (var i = 0; i < series[0].data.length; i++) {
                if (summary.averageMonth.startMonth <= series[0].data[i].month) {
                    indexOfFirstFullMonth = i;
                    break;
                }
            }

            plotBands.unshift({ color: '#eee', value: indexOfFirstFullMonth - .5, width: 1 });
        }

        var indexOfFirstFutureMonth;

        // Dim the current month
        if (summary.averageMonth.endMonth < series[0].data[series[0].data.length - 1].month) {
            for (var i = 0; i < series[0].data.length; i++) {
                if (summary.averageMonth.endMonth < series[0].data[i].month) {
                    indexOfFirstFutureMonth = i;
                    break;
                }
            }

            plotBands.push({ color: '#eee', value: indexOfFirstFutureMonth - 0.5, width: 1 });
        }

        return {
            chart: {
                defaultSeriesType: 'areaspline',
                marginTop: 5
            },
            plotOptions: {
                series: {
                    animation: animate,
                    events: {
                        click: onClick,
                        mouseOut: tooltip.handleMouseOut
                    },
                    stickyTracking: true,
                    point: {
                        events: {
                            mouseOver: tooltip.handleMouseOver
                        }
                    }
                },
                areaspline: {
                    marker: {
                        lineColor: '#ffffff',
                        lineWidth: 2,
                        radius: 5,
                        marker: 'circle'
                    },
                    lineWidth: 3,
                    shadow: {
                        color: '#fff',
                        offsetX: 0,
                        offsetY: 0,
                        opacity: 1,
                        width: 1
                    }
                }
            },
            xAxis: {
                categories: getXAxisLabels(summary),
                max: maxX - 1.3,
                min: 0.3,
                plotBands: plotBands
            },
            yAxis: {
                plotLines: plotLines,
                max: maxY * 1.20
            },
            series: series,
            tooltip: {
                shared: true,
                crosshairs: true,
                enabled: false
            }
        };
    }


    return core.Base.extend({
        template: template,

        constructor: function (summary, onClick, comparisonCategoryId, amountMultiplier) {
            amountMultiplier = amountMultiplier || 1;

            var primaryCategoryData = getPrimaryCategoryData(summary, amountMultiplier);

            var primarySeries = {
                data: primaryCategoryData.values,
                showInLegend: false,
                name: 'Total',                
                tooltip: {
                    average: primaryCategoryData.average,
                    bullet: this.getBullet(summary.reportType)
                }
            };

            _.extend(primarySeries, this.getStyle(summary.reportType));

            var series = [primarySeries];

            if (comparisonCategoryId) {
                var secondaryCategoryData = getSecondaryCategoryData(summary, comparisonCategoryId, amountMultiplier);
                var secondarySeries = {
                    name: categoryService.getCategoryNameById(comparisonCategoryId),
                    data: secondaryCategoryData.values,
                    tooltip: {
                        average: secondaryCategoryData.average
                    }
                };
                _.extend(secondarySeries, styles.comparison);
                series.push(secondarySeries);
            }

            this.tooltip = new CategoryHistoryChartTooltip(series);
            this.chart = getHistoryChart(summary, series, this.tooltip, onClick, true);
        },

        getStyle: function(reportType) {
            if (reportType === 'Income')
                return styles['income'];

            if (reportType === 'Saving')
                return styles['saving'];

            return styles['consumption'];
        },

        getBullet: function(reportType) {
            if (reportType === 'Income')
                return 'income';

            if (reportType === 'Saving')
                return 'saving';

            return 'consumption';
        },

        dispose: function() {
            this.tooltip.dispose();
        }
    });
});