define(function (require) {
    var core = require('framework/core');
    var template = require('template!BudgetMissingDataModal');
    var budgetService = require('services/budgetService');
    var config = require('config');


    return core.Popup.extend({
        template: template,

        constructor: function (dataCheckResult) {
            this.isReadyForBudgets = ko.observable(dataCheckResult.isReadyForBudgets);

            this.tasks = ko.observableArray(dataCheckResult.tasks);
            this.processing = ko.observable(false);

            this.state = ko.computed(function () {
                if (this.tasks().every(function (t) { return t.state === 'ReadyForAuto'; }))
                    return 'ReadyForAuto';
                if (this.tasks().every(function (t) { return t.state === 'ReadyForAuto' || t.state === 'Warning'; }))
                    return 'Warning';
                else if (this.tasks().some(function (t) { return t.state === 'ShowStopper'; }))
                    return 'ShowStopper';

                return 'PreventsAutoBudget';
            }, this);

            this.buttonText = ko.computed(function () {
                var taskToFix = this.tasks().find(function (t) { return t.state !== 'ReadyForAuto' && t.state !== 'Warning'; });
                if (!taskToFix)
                    return 'Kom igang';

                if (taskToFix.solution === 'ImportPostings')
                    return 'Tilføj konti';
                else if (taskToFix.solution === 'Categorize')
                    return 'Kategoriser poster';
                else
                    throw new Error("Unknown task solution " + taskToFix.solution);
            }, this);

            this.base({ disposeOnClose: true });
        },

        createBudgetManually: function () {
            this.createBudgets(false);
        },

        createBudgets: function (automaticSetup) {
            var me = this;

            this.processing(true);
            budgetService.createInitialBudgets({ automaticSetup: automaticSetup }).then(function () {
                budgetService.getBudgetSummaryForYear(new Date().getFullYear()).then(function () {
                    // createInitialBudgets sends the budgetsChanged message, which BudgetPage listens to, so we don't need to do anything more here.
                    me.close();
                });
            });
        },

        complete: function () {
            var taskToFix = this.tasks().find(function (t) { return t.state !== 'ReadyForAuto' && t.state !== 'Warning'; });

            if (!taskToFix) {
                this.createBudgets(true);
                return;
            }

            this.processing(true);

            if (taskToFix.solution === 'ImportPostings') {
                this.close();
                core.Application.instance.navigate('account-index', null, { trigger: true });
            } else if (taskToFix.solution === 'Categorize') {
                var toMonth = new Date().addMonths(-1);
                var fromMonth = toMonth.addMonths(-11);
                location.assign(config.serverPages['posting_Index'] + '?' + $.param({ categorizationStatus: 'Uncategorized', fromMonth: fromMonth.toMonthString(), toMonth: toMonth.toMonthString() }));
            } else
                throw new Error("Unknown task solution " + taskToFix.solution);
        }
    });
});
