define(function(require) {
    var core = require('framework/core');
    var template = require('template!DisposableAmountInfo');
    var budgetService = require('services/budgetService');
    var utilities = require('utilities/utilities');
    var session = require('session');

    var ko = core.ko;

    return core.Base.extend({
        template: template,

        constructor: function(year) {
            var me = this;

            this.disposableAmount = ko.observable(0);
            this.consumptionLimit = ko.observable(0);
            this.visible = ko.observable(false);


            this.disposableAmountText = ko.computed(function() {
                var difference = Math.round(this.disposableAmount() - this.consumptionLimit());

                var formatted = utilities.formatPrice(Math.abs(difference));

                if (difference < 0)
                    return '<strong>' + formatted + ' kr over dit rådighedsbeløb</strong>';
                else if (difference > 0)
                    return formatted + ' ' + session.currency.symbol + ' under dit rådighedsbeløb';
                else
                    return 'Præcis dit rådighedsbeløb';
            }, this);

            this.tooltipText = ko.computed(function() {
                return 'Dit rådighedsbeløb er de penge du har tilbage til forbrug, når vi har trukket alle regninger fra din indkomst.<br><br>Rådighedsbeløb: ' + utilities.formatPrice(this.disposableAmount()) + ' ' + session.currency.symbol;
            }, this);

            budgetService.getDisposableAmount(year).then(function(amount) {
                me.disposableAmount(amount);
                me.visible(true);
            });
        }
    });
});
