define(function(require) {
    var core = require('framework/core');
    var networkService = require('./networkService');
    var categoryService = require('./categoryService');
    var session = require('session');

    var postingsByYear = { };
    var budgetSummariesByYear = {};

    core.hub.on('postingsChanged', function() {
        postingsByYear = {};
        budgetSummariesByYear = {};
    });

    return {
        getBudgetSummaryForYear: function(year) {
            if (!budgetSummariesByYear[year])
                budgetSummariesByYear[year] = networkService.ajaxGet('getBudgetSummaryForYear', { year: year });

            return budgetSummariesByYear[year];
        },

        getBudgets: function(categoryId, year) {
            return this
                .getBudgetSummaryForYear(year)
                .then(function(budgetSummary) {
                    return budgetSummary.budgets.filter(function(b) { return b.categoryId === categoryId && b.year === year; });
                });
        },

        getConsumptionLimit: function(year) {
            return this.getBudgets(null, year)
                .then(function(budgets) { return budgets[0].budgetted[0]; });
        },

        saveConsumptionLimit: function(year, newConsumptionLimit) {
            var me = this;

            return this.getBudgets(null, year)
                .then(function(budgets) {
                    var budgetToSave = budgets[0];

                    budgetToSave.budgetted = _.range(0, 12).map(function() { return newConsumptionLimit; });

                    return me.updateBudget(budgetToSave);
                });
        },

        createInitialBudgets: function(options) {
            var me = this;
            options = _.extend({ automaticSetup: true }, options);
            return networkService.ajaxPost('createInitialBudgets', options).then(function () {
                me.fireBudgetsChanged();
            });
        },

        getPostings: function(month, categoryId) {
            var subcategoryIds = { };
            if (categoryService.isMainCategoryId(categoryId)) {
                session.subcategories
                    .filter(function(sc) { return sc.categoryId === categoryId && sc.expenseType === 'Variable'; })
                    .forEach(function(sc) { subcategoryIds[sc.id] = 1; });
            } else {
                subcategoryIds[categoryId] = 1;
            }

            var date = Date.fromMonth(month);
            var year = date.getFullYear();

            if (!postingsByYear[year]) {
                postingsByYear[year] = networkService
                    .ajaxGet('getPostingsForBudgets', { year: year })
                    .then(function(postings) {
                        _.each(postings, function(p) {
                            p.date = Date.fromIsoDate(p.date);
                        });
                    });
            }

            return postingsByYear[year].then(function(postings) {
                return _.filter(postings, function(p) { return subcategoryIds[p.subcategoryId] && p.date.getMonth() === date.getMonth(); });
            });
        },

        fireBudgetsChanged: function() {
            budgetSummariesByYear = { };
            core.hub.post('budgetsChanged');
        },

        updateBudget: function(budget) {
            var me = this;

            return networkService
                .ajaxPost('updateBudget', budget)
                .then(function() {
                    me.fireBudgetsChanged();
                });
        },

        saveBudgets: function(options) {
            var me = this;

            options = _.extend({
                budgets: null,
                onSuccess: function() {
                }
            }, options);

            networkService
                .ajaxPost('saveBudgets', options.budgets)
                .then(function() {
                    me.fireBudgetsChanged();
                    options.onSuccess();
                });
        },

        getCategoryInfoForBudget: function(categoryId, year) {
            return networkService.ajaxPost('getCategoryInfoForBudget', {
                categoryId: categoryId,
                year: year
            });
        },

        calculateFixedBudgetForSubcategory: function(subcategoryId, year) {
            return networkService
                .ajaxGet('calculateFixedBudgetForSubcategory', {
                    subcategoryId: subcategoryId,
                    year: year
                });
        },

        getDisposableAmount: function(year) {
            return networkService.ajaxGet('getDisposableAmount', { year: year });
        },

        checkUserDataForBudgets: function() {
            return networkService.ajaxGet('checkUserDataForBudgets');
        },

        deleteAllBudgets: function () {
            var me = this;
            return networkService.ajaxPost('deleteAllBudgets').then(function () {
                me.fireBudgetsChanged();
            });
        }
    };
});
