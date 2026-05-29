define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetModal');
    var Wizard = require('components/wizard/Wizard');
    var BudgetModalCategoryStep = require('./BudgetModalCategoryStep');
    var BudgetModalEditorStep = require('./BudgetModalEditorStep');


        return core.Popup.extend({
            template: template,

            constructor: function(options) {
                var me = this;

                options = _.extend({
                    operation: 'create',
                    year: null,
                    categoryId: null,
                    budgetType: null,
                    newBudget: { }
                }, options);
                
                if (!options.year || !options.budgetType)
                    throw 'BudgetModal: year and budgetType must be specified';

                if (options.operation !== 'create' && options.operation !== 'edit')
                    throw 'BudgetModal: operation must be either "create" or "edit"';

                if (options.operation === 'edit') {
                    if (options.budgetType === 'consumptionLimit') {
                        if (options.categoryId)
                            throw 'BudgetModal: categoryId must not be set when editing consumption limit';
                    } else {
                        if (!options.categoryId)
                            throw 'BudgetModal: categoryId must be set when editing';
                    }
                }

                var steps = options.operation === 'create' && !options.categoryId
                    ? [BudgetModalCategoryStep, BudgetModalEditorStep] 
                    : [BudgetModalEditorStep];

                this.wizard = new Wizard(steps, options);

                this.wizard.complete = function() {
                    me.close();
                };
                this.wizard.showPager(false);

                this.base({ disposeOnClose: true });
            }
        });
    });