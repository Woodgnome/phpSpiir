define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetModalCategoryStep');
    var Step = require('components/wizard/Step');
    var categoryService = require('services/categoryService');
    var config = require('config');


        return Step.extend({
            template: template,

            constructor: function(wizard, processing, wizardState) {
                _.bindAll(this, 'selectBudgetType');

                this.budgetType = ko.observable(wizardState.budgetType);

                this.budgetType.subscribe(function() {
                    this.categoryId(null);
                }, this);

                this.categoryId = ko.observable();

                this.categories = ko.computed(function() {
                    if (this.budgetType() === 'income')
                        return categoryService.getSubcategoriesComboboxSourceByCategoryId(11);
                    else if (this.budgetType() === 'bill')
                        return categoryService.getExpenseSubcategoriesComboboxSourceByExpenseType('Fixed', false);
                    else if (this.budgetType() === 'consumption')
                        return categoryService.getExpenseSubcategoriesComboboxSourceByExpenseType('Variable', true);

                    return [];
                }, this);

                this.budgetTypes = [
                    {
                        selected: ko.observable(this.budgetType() === 'income'),
                        title: 'Indkomst',
                        budgetType: 'income',
                        description: 'Fx løn, S.U, pension, børnepenge, feriepenge '
                    },
                    {
                        selected: ko.observable(this.budgetType() === 'bill'),
                        title: 'Regning',
                        budgetType: 'bill',
                        description: 'Fx husleje, TV & licens, forsikringer, telefoni og internet'
                    },
                    {
                        selected: ko.observable(this.budgetType() === 'consumption'),
                        title: 'Forbrug',
                        budgetType: 'consumption',
                        description: 'Alle de køb du gør i dagligdagen, som mad, restaurant og tøj'
                    }
                ];

                this.canContinue = this.categoryId;

                this.nextTooltip = ko.computed(function() {
                    return this.categoryId() ? '' : 'Vælg venligst kategori før du fortsætter';
                }, this);

                this.base.apply(this, arguments);
            },

            selectBudgetType: function(budgetTypeViewModel) {
                this.budgetTypes.forEach(function(bt) {
                    bt.selected(bt === budgetTypeViewModel);
                });
                this.budgetType(budgetTypeViewModel.budgetType);
            },

            complete: function(callback) {
                this.wizardState.budgetType = this.budgetType();
                this.wizardState.categoryId = this.categoryId();
                callback();
            }
        });
    });