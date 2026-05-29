define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetSidebar');
    var config = require('config');
    var session = require('session');
    var utilities = require('utilities/utilities');
    var categoryService = require('services/categoryService');
    var budgetService = require('services/budgetService');
    var BudgetModal = require('../budgetModal/BudgetModal');
    var BudgetBarometer = require('./BudgetBarometer');
    var ExtraordinaryPostingsTooltip = require('components/extraordinary/ExtraordinaryPostingsTooltip');


        return core.Component.extend({
            template: template,

            constructor: function() {
                this.year = ko.observable(new Date().getFullYear());
                this.budgetType = ko.observable('bill');

                this.budgetBarometer = new BudgetBarometer();

                this.yearBudget = ko.observable();
                this.yearDifference = ko.observable();
                this.realized = ko.observable();
                this.isProjected = ko.observable(true);

                this.averageIncome = ko.observable();
                this.averageBill = ko.observable();
                this.disposableAmount = ko.observable();
                this.averageConsumption = ko.observable();
                this.averageResult = ko.observable();
                this.showExtraordinaryResult = ko.observable(false);
                this.realizedWithExtraordinary = ko.observable();
                this.extraordinaryTooltip = new ExtraordinaryPostingsTooltip();

                this.currency = session.currency;

                this.updateUI();
                this.subscribeToHubMessage('budgetsChanged', this.updateUI.bind(this));
                this.year.subscribe(this.updateUI.bind(this));
            },

            updateUI: function() {
                var me = this;

                budgetService.getBudgetSummaryForYear(this.year()).then(function(budgetSummary) {
                    if (!budgetSummary)
                        return;

                    me.realized(budgetSummary.barometer.realized);
                    me.isProjected(budgetSummary.barometer.isProjected);

                    me.yearBudget(budgetSummary.barometer.budget);
                    me.yearDifference(budgetSummary.barometer.difference);
                    me.budgetBarometer.update(budgetSummary);

                    me.showExtraordinaryResult(budgetSummary.barometer.realizedWithExtraordinary !== null && budgetSummary.barometer.realizedWithExtraordinary !== budgetSummary.barometer.realized);
                    me.realizedWithExtraordinary(budgetSummary.barometer.realizedWithExtraordinary);

                    me.averageIncome(budgetSummary.income.averageBudget);
                    me.averageBill(budgetSummary.bill.averageBudget);
                    me.disposableAmount(budgetSummary.income.averageBudget - budgetSummary.bill.averageBudget);
                    me.averageConsumption(-1 * budgetSummary.consumption.averageBudget);
                    me.averageResult(budgetSummary.result.averageBudget);

                    var today = new Date();
                    me.extraordinaryTooltip.update({
                        income: budgetSummary.barometer.extraordinaryIncome,
                        expenses: budgetSummary.barometer.extraordinaryExpenses,
                        startMonth: me.year() + '01',
                        endMonth: me.year() < today.getFullYear() ? me.year() + '12' : null
                    });
                });
            },

            changeState: function(state) {
                this.budgetType(state.budgetType);
                this.year(state.year);
            },

            dispose: function () {
                this.extraordinaryTooltip.dispose();
                this.base();
            }
        });
    });
