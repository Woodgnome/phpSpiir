define(function(require) {
    var core = require('framework/core');
    var template = require('template!FixedBudgetList');
    var categoryService = require('services/categoryService');
    var BudgetModal = require('../budgetModal/BudgetModal');
    var BudgetListRow = require('./BudgetListRow');



    var MainCategoryViewModel = core.Base.extend({
        constructor: function(mainCategory) {
            _.extend(this, mainCategory);

            this.showFixedBudgetGroups = ko.observable(false);
        },

        toggleFixedBudgetGroups: function() {
            this.showFixedBudgetGroups(!this.showFixedBudgetGroups());
        }
    });

    return core.Base.extend({
        template: template,

        constructor: function(fixedBudgetSummary, budgetType, year) {
            var me = this;
            this.mainCategories = this.getMainCategories(fixedBudgetSummary, budgetType, year);
            
            if (this.mainCategories.length === 1)
                this.mainCategories[0].isExpanded(true);
            else {
                var currentlyExpanded = -1;
                this.mainCategories.forEach(function(mainCategory, i) {
                    mainCategory.isExpanded.subscribe(function(isExpanded) {
                        if (!isExpanded && currentlyExpanded === i) {
                            // collapsing the currently exposed
                            currentlyExpanded = -1;
                            me.mainCategories.forEach(function(mc) { mc.isTonedDown(false); });
                            return;
                        }
                        if (!isExpanded) {
                            // collapsing other than the currently exposed - the handler for the current one controls
                            return;
                        }

                        if (currentlyExpanded !== -1)
                            me.mainCategories[currentlyExpanded].isExpanded(false);

                        currentlyExpanded = i; 

                        me.mainCategories.forEach(function(otherMainCategory, j) {
                            otherMainCategory.isTonedDown(i !== j);
                        });
                    });
                });
            }


            this.rest = this.getRest(fixedBudgetSummary, budgetType, year);
        },

        getMainCategories: function(fixedBudgetSummary, budgetType, year) {
            var fixedBudgetGroupsByMainCategory = fixedBudgetSummary.fixedBudgetGroups
                .groupBy(function(fbg) { return fbg.mainCategoryId; });

            return _.map(fixedBudgetGroupsByMainCategory, function(fixedBudgetGroups, mainCategoryId) {
                var fixedBudgetGroupRows = fixedBudgetGroups.map(function(fbg) { return new BudgetListRow(budgetType, year, fbg); });

                var row = new BudgetListRow(budgetType, year, {
                    categoryId: mainCategoryId,
                    subRows: fixedBudgetGroupRows,
                    toggleMode: true,
                    clickBehaviour: 'expand'
                });
                
                return new MainCategoryViewModel(row);
            });
        },

        getRest: function(fixedBudgetSummary, budgetType, year) {
            var restSubcategoriesViewModels = fixedBudgetSummary.fixedBudgetRest.subcategoriesWithoutBudgets.map(function(fbg) {
                return new BudgetListRow(budgetType, year, fbg, true);
            });

            var data = {
                fixedBudgetGroups: restSubcategoriesViewModels
            };
            
            return new MainCategoryViewModel(data);
        }
    });
});