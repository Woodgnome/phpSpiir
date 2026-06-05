define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountBalanceChart');
    var accountService = require('services/accountService');
    var session = require('session');

    function getChartOptions(points) {
        var series = [{
            data: points
                .map(function(p) {
                    return {
                        x: Date.fromIsoDate(p.date).getTime(),
                        y: p.balance
                    };
                })
                .sortBy(function(p) { return p.x; })
        }];

        return {
            chart: {
                defaultSeriesType: 'areaspline',
                marginTop: 5,
                zoomType: 'x'
            },
            plotOptions: {
                areaspline: {
                    animation: true,
                    stickyTracking: true,
                    marker: { enabled: false }
                }
            },
            xAxis: {
                type: 'datetime',
                maxZoom: 14 * 24 * 3600000 // 14 days
            },
            series: series,
            tooltip: {
                enabled: true,
                formatter: function() {
                    return new Date(this.x).format('%e. %b %Y') + ': <b>' + this.y.formatPrice() + ' ' + session.currency.symbol + '</b>';
                },
                crosshairs: true
            }
        };
    }


    return core.Component.extend({
        template: template,

        constructor: function(accountGroupDto) {
            var me = this;
            this.processing = ko.processingObservable();
            this.balanceChart = ko.observable();

            this.processing(true);

            accountService.getBalanceHistory(accountGroupDto.id)
                .then(function(points) {
                    me.processing(false);
                    me.balanceChart(getChartOptions(points));
                });
        }
    });
});
