define(function(require) {
    var core = require('framework/core');
    var template = require('template!CategoryHistoryChartTooltip');
    var ChartTooltipBase = require('components/ChartTooltipBase');
    var session = require('session');

    return ChartTooltipBase.extend({
        template: template,

        constructor: function(series) {
            this.currency = session.currency;
            this.series = series;
            this.showSecondarySeries = this.series.length > 1;
            this.primaryCategoryName = this.series[0].name;
            this.secondaryCategoryName = this.showSecondarySeries ? this.series[1].name : '';
            this.primaryBulletClass = this.series[0].tooltip.bullet + 'Bullet';
            this.primaryAverage = this.series[0].tooltip.average;
            this.secondaryAverage = this.showSecondarySeries  ? this.series[1].tooltip.average : 0;

            this.point = ko.observable({ month: '' });

            this.base();
        },

        update: function(chartPoint) {
            this.point({
                month: this.series[0].data[chartPoint.x].month,
                primaryCategoryAmount: this.series[0].data[chartPoint.x].y,
                secondaryCategoryAmount: this.showSecondarySeries ? this.series[1].data[chartPoint.x].y : 0
            });
        }
    });
});
