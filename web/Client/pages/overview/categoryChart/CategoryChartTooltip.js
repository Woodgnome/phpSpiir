define(function(require) {
    var core = require('framework/core');
    var template = require('template!CategoryChartTooltip');
    var ChartTooltipBase = require('components/ChartTooltipBase');
    var session = require('session');
    var config = require('config');

    var ko = core.ko;

    return ChartTooltipBase.extend({
        template: template,

        constructor: function() {
            this.currency = session.currency;
            this.point = ko.observable({ month: '' });

            this.postings = ko.computed(function() {
                return this.point().topPostings;
            }, this);
            this.categoryName = ko.computed(function() {
                return this.point().name;
            }, this);

            this.amountMultiplier = ko.computed(function() {
                return this.point().reportType === 'Income' ? 1 : -1;
            }, this);

            this.average = ko.computed(function() {
                return this.point().month.isAverage ? this.point().y : this.point().averageAmount;
            }, this);

            this.amount = ko.computed(function() {
                return this.point().month.isAverage ? null : this.point().y;
            }, this);

            this.bulletClass = ko.computed(function() {
                return this.point().reportType === 'Income' ? 'incomeBullet' : 'consumptionBullet';
            }, this);

            this.amountTitle = ko.computed(function() {
                var month = this.point().month;
                if (!month || !month.month) return '';
                return Date.fromMonth(month.month).format('%b %Y');
            }, this);

            this.postingUrl = ko.computed(function() {
                if (!this.point()) return;
                return config.urls.postings + '?' + $.param(this.point().postingPageParameters || {});
            }, this);

            this.base();
        },

        update: function(chartPoint) {
            this.point(chartPoint);
        }
    });
});
