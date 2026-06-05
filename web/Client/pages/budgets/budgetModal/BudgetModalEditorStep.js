define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetModalEditorStep');
    var utilities = require('utilities/utilities');
    var Step = require('components/wizard/Step');
    var BudgetEditor = require('./BudgetEditor');
    var SimpleBudgetEditor = require('./SimpleBudgetEditor');
    var categoryService = require('services/categoryService');
    var budgetService = require('services/budgetService');
    var financialStatisticService = require('services/financialStatisticService');
    var BudgetModalChart = require('./BudgetModalChart');
    var PeriodPicker = require('../yearPicker/PeriodPicker');
    var session = require('session');


        var FixedBudgetLeftActions = core.Base.extend({
            template: '<ul class="consumptionLeftActions"><li><button type="button" class="btn" data-bind="click: resetBudgets, disable: processing">Genberegn budgetter</button></li></ul>',

            constructor: function(parent) {
                this.parent = parent;
                this.processing = parent.processing;
            },

            newBudget: function() {
                this.parent.newBudget();
            },

            resetBudgets: function() {
                this.parent.resetBudgets();
            }
        });

        var ConsumptionLeftActions = core.Base.extend({
            template: '<ul class="consumptionLeftActions"><li><button type="button" class="btn" data-bind="click: deleteBudget, visible: showDelete, disable: processing">Slet budget</button></li>'
                + '<li><label class="rollover" data-bind="tooltip: \'Vælger du et løbende budget, så overføres overskud eller underskud til næste måned. Det er brugbart, hvis du har et forbrug, som ikke falder ens hver måned. Fx tøj, hvor du vil have styr på, hvor meget du bruger på et år, men ikke ved hvornår du køber.\', tooltipOptions: { width: 200 }">'
                + '<span class="runner"></span>'
                + '<input type="checkbox" data-bind="checked: rollover" /> Løbende budget'
                + '</label></li></ul>',

            constructor: function(parent, showDelete) {
                this.parent = parent;
                this.showDelete = showDelete;
                this.processing = parent.processing;
                this.rollover = parent.rollover;
            },

            deleteBudget: function() {
                this.parent.deleteBudget();
            }
        });


        return Step.extend({
            template: template,

            constructor: function(wizard, processing, wizardState) {
                this.processing = processing;
                this.wizardState = wizardState;

                this.budgetType = ko.observable();
                this.operation = ko.observable();
                this.year = ko.observable();
                this.month = ko.observable();
                this.categoryId = ko.observable();
                this.chart = ko.observable();
                this.budgetEditor = ko.observable();
                this.rollover = ko.observable(false);
                this.currency = session.currency;

                this.isFixedBudgetType = ko.computed(function() {
                    return this.budgetType() === 'income' || this.budgetType() === 'bill';
                }, this);

                this.periodPicker = ko.observable();

                this.nextLabel = ko.computed(function() {
                    return this.operation() === 'create' ? 'Opret' : 'Gem';
                }, this);

                this.customLeftActions = ko.computed(function() {
                    if (this.isFixedBudgetType())
                        return new FixedBudgetLeftActions(this);
                    else
                        return new ConsumptionLeftActions(this, this.operation() === 'edit' && this.budgetType() === 'consumption');
                }, this);

                this.statistics = ko.observableArray();
                this.title = ko.computed(this.computeTitle, this);

                _.bindAll(this, 'selectStatistic');

                this.base.apply(this, arguments);
            },

            beforeShowing: function() {
                var me = this;
                var options = this.wizardState;

                this.budgetType(options.budgetType);
                this.operation(options.operation);
                this.year(options.year);
                this.categoryId(options.categoryId);

                this.chart(new BudgetModalChart(options.budgetType, options.year, this.onChartMonthClick.bind(this)));

                var editorClass = this.isFixedBudgetType() ? BudgetEditor : SimpleBudgetEditor;

                this.budgetEditor(new editorClass({
                    categoryId: this.categoryId(),
                    budgetType: this.budgetType(),
                    year: this.year(),
                    onTotalChanged: function(budgetted) {
                        me.chart().setBudgetted(budgetted);
                    }
                }));

                this.rollover.subscribe(function(rollover) {
                    me.chart().setRollover(rollover);
                    me.budgetEditor().rollover(rollover);
                });

                if (!this.isFixedBudgetType()) {
                    // TODO: Support other years than current
                    var currentYear = new Date().getFullYear();

                    var selectedMonth;
                    if (this.year() < currentYear)
                        selectedMonth = 11;
                    else if (this.year() > currentYear)
                        selectedMonth = 0;
                    else
                        selectedMonth = new Date().getMonth();

                    this.month(new Date(this.year(), selectedMonth, 1).toMonthString());

                    this.periodPicker(new PeriodPicker({
                        mode: 'month',
                        from: new Date(this.year(), 0, 1).toMonthString(),
                        to: new Date(this.year(), 11, 1).toMonthString(),
                        value: this.month(),
                        onChange: function(month) {
                            me.budgetEditor().setMonth(month);
                        }
                    }));
                    me.budgetEditor().setMonth(this.month());
                }

                budgetService.getBudgets(this.categoryId(), this.year())
                    .then(function(budgets) {
                        me.budgetEditor().setBudgets(budgets);

                        me.rollover(budgets.length > 0 ? budgets[0].rollover || false : false);

                        if (me.operation() === 'create' && (me.isFixedBudgetType() || budgets.length === 0)) {
                            me.budgetEditor().newBudget(options.newBudget);

                            if (!me.isFixedBudgetType()) {
                                me.periodPicker().setCustomLabel(new Date(me.year(), 0, 1).toMonthString(), 'hele ' + me.year());
                                me.setMonthIndex(0);
                            }
                        }
                    });

                budgetService.getCategoryInfoForBudget(this.categoryId(), this.year())
                    .then(function(categoryInfo) {
                        me.chart().setRealized(categoryInfo.months);
                    });

                this.setupFinancialStatistics();
            },

            setupFinancialStatistics: function() {
                var me = this;

                var currentUserPrefix = {
                    income: 'Din indkomst',
                    bill: 'Dine udgifter',
                    consumption: 'Dit forbrug',
                    consumptionLimit: 'Dit samlede forbrug',
                };

                financialStatisticService.getFinancialStatisticForCategory(this.categoryId())
                    .then(function(result) {
                        me.statistics.push({
                            id: 'currentUser',
                            value: result.currentUser,
                            tooltip: currentUserPrefix[me.budgetType()] + '<br><small>(Gns. for sidste 12 mdr)</small>',
                            selected: ko.observable(true)
                        });


                        me.selectStatistic(me.statistics()[0]);
                    });
            },

            onChartMonthClick: function(monthIndex) {
                if (this.isFixedBudgetType())
                    return;

                this.setMonthIndex(monthIndex);
            },

            setMonthIndex: function(monthIndex) {
                var month = new Date(this.year(), monthIndex, 1).toMonthString();

                this.budgetEditor().setMonth(month);
                this.month(month);
                this.periodPicker().setValue(month);
            },

            computeTitle: function() {
                if (this.budgetType() === 'consumptionLimit')
                    return 'Forbrugsloft for ';

                if (!this.categoryId())
                    return;

                var title = categoryService.getCategoryNameById(this.categoryId()) + ' for ';
                if (this.isFixedBudgetType())
                    title += this.year();

                return title;
            },

            complete: function(callback, abort) {

                var me = this;

                var errors = this.budgetEditor().getErrors();
                if (errors.length > 0) {
                    alert(errors.join('\n'));
                    abort();
                    return;
                }

                this.processing(true);

                budgetService.saveBudgets({
                    budgets: this.budgetEditor().getBudgets(),
                    onSuccess: function() {
                        me.processing(false);
                        callback();
                    }
                });
            },

            // fixed
            newBudget: function() {
                this.budgetEditor().newBudget();
            },

            // consumption
            deleteBudget: function() {
                var me = this;

                if (this.budgetType() !== 'consumption')
                    throw new Error('deleteBudget: Works only for consumption budgets');

                this.processing(true);

                budgetService.getBudgets(this.categoryId(), this.year())
                    .then(function(budgets) {
                        budgetService.saveBudgets({
                            budgets: { budgetsToDelete: budgets },
                            onSuccess: function() {
                                me.processing(false);
                                me.wizard.complete();
                            }
                        });
                    });
            },

            // fixed
            resetBudgets: function() {
                var me = this;

                this.processing(true);

                budgetService.calculateFixedBudgetForSubcategory(this.categoryId(), this.year())
                    .then(function(calculatedBudgets) {
                        me.budgetEditor().resetBudgets(calculatedBudgets);
                        me.processing(false);
                    });
            },

            selectStatistic: function(statistic) {
                this.statistics().find(function(s) { return s.selected(); }).selected(false);
                statistic.selected(true);

                this.chart().showStatisticLine(statistic.value);
            }
        });
    });
