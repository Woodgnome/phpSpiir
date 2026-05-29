define(function(require) {
    var core = require('framework/core');
    var template = require('template!DeleteAllBudgetsModal');
    var budgetService = require('services/budgetService');


    return core.Popup.extend({
        template: template,

        constructor: function() {
            this.processing = ko.observable(false);
            this.base({ disposeOnClose: true });
        },
        
        deleteAllBudgets: function () {
            var me = this;
            this.processing(true);
            //budgetService.deleteAllBudgets() fires BudgetsChanged
            budgetService.deleteAllBudgets().then(function () {
                me.close();
            });
        }
    });
});