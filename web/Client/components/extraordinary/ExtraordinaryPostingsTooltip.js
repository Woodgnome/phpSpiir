define(function(require) {
    var core = require('framework/core');
    var template = require('template!ExtraordinaryPostingsTooltip');
    var TooltipBase = require('components/TooltipBase');
    var config = require('config');
    var session = require('session');

    return TooltipBase.extend({
        template: template,

        constructor: function() {
            this.income = ko.observable();
            this.expenses = ko.observable();
            this.savings = ko.observable();

            this.total = ko.computed(function() {
                return this.income() + this.expenses();
            }, this);
            this.postingsUrl = ko.observable();
            this.result = ko.observable(null);

            this.currency = session.currency;

            this.base({
                position: 'left',
                disposeOnClose: false
            });
        },

        update: function(data) {
            this.income(data.income);
            this.expenses(data.expenses);
            this.savings(data.saving);

            var urlParams = { onlyExtraordinary: true, fromMonth: data.startMonth };
            if (data.endMonth) urlParams.toMonth = data.endMonth;
            this.postingsUrl(config.urls.postings + '?' + $.param(urlParams));
        }
    });
});
