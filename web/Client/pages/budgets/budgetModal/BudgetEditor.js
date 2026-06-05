define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetEditor');
    var utilities = require('utilities/utilities');
    var session = require('session');

    var ko = core.ko;

    var Row = core.Base.extend({
        constructor: function(budget, selectAll) {
            this.budgetId = budget.budgetId;
            this.budgetType = budget.budgetType;
            this.categoryId = budget.categoryId;
            this.year = budget.year;
            this.isFixedBudgetType = this.budgetType === 'income' || this.budgetType === 'bill';
            this.isConsumptionBudgetType = this.budgetType === 'consumption';
            this.currency = session.currency;

            this.name = ko.observable(budget.name);
            this.continueNextYear = ko.observable(budget.continueNextYear);
            this.continueNextYearTitle = ko.computed(function() {
                return this.continueNextYear() ? "Dette budget fortsætter uændret næste år" : "Dette budget fortsættes ikke næste år";
            }, this);
            this.rollover = ko.observable(budget.rollover);
            this.hasFocus = ko.observable(false);

            this.months = budget.budgetted.map(function(b, index) {
                var monthName = utilities.language.monthNames[index];
                return {
                    index: index,
                    selected: ko.observable(selectAll ? true : b != 0),
                    text: monthName.charAt(0).toUpperCase(),
                    title: monthName
                };
            });

            this.amount = ko.numericObservable(budget.budgetted.find(function(b) { return b != 0; }) || 0, {});

            this.total = ko.computed(function() {
                var count = this.months.filter(function(m) { return m.selected(); }).length;
                return count * this.amount();
            }, this).extend({ throttle: 200 });
        },

        toggleMonth: function(month) {
            month.selected(!month.selected());
        },

        toggleContinueNextYear: function(budget) {
            this.continueNextYear(!this.continueNextYear());
        },

        getBudget: function() {
            return {
                budgetType: this.budgetType,
                budgetId: this.budgetId,
                year: this.year,
                continueNextYear: this.continueNextYear(),
                rollover: this.rollover(),
                categoryId: this.categoryId,
                name: this.name(),
                budgetted: this.getBudgetted()
            };
        },

        isNewAndEmpty: function() {
            var isNew = !this.budgetId;
            var isEmpty = !this.name() && !this.amount();
            return isNew && isEmpty;
        },

        isValid: function() {
            return (this.budgetType == 'consumption' || this.budgetType == 'consumptionLimit' || this.name())
                && this.amount()
                && this.months.some(function(m) { return m.selected(); });
        },

        getBudgetted: function() {
            var me = this;
            return this.months.map(function(m) { return m.selected() ? me.amount() : 0; });
        }
    });

    return core.Base.extend({
        template: template,

        constructor: function(options) {
            var me = this;

            options = _.extend({
                budgetted: [],
                categoryId: null,
                budgetType: null,
                year: 0,
                onRolloverChanged: function() {
                },
                onTotalChanged: function() {
                }
            }, options);

            this.year = options.year;
            this.budgetsToDelete = [];
            this.categoryId = options.categoryId;
            this.budgetType = options.budgetType;
            this.onTotalChanged = options.onTotalChanged;
            this.allowMultipleRows = this.budgetType === 'income' || this.budgetType === 'bill';

            this.removeRow = this.removeRow.bind(this);

            this.rows = ko.observableArray();

            this.onRolloverChanged = options.onRolloverChanged;
            this.rollover = ko.computed(function() {
                if (me.rows().length === 0)
                    return false;
                else
                    return me.rows()[0].rollover();
            });
            this.rollover.subscribe(function(rollover) {
                me.onRolloverChanged(rollover);
            });

            this.totalBudgetted = ko.computed(function() {
                var allBudgetted = this.rows().map(function(r) { return r.getBudgetted(); });

                var total = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                for (var x = 0; x < allBudgetted.length; x++)
                    for (var i = 0; i < 12; i++)
                        total[i] += allBudgetted[x][i];

                return total;
            }, this).extend({ throttle: 300 });

            this.onTotalChanged(this.totalBudgetted());

            this.totalBudgetted.subscribe(function(budgetted) {
                me.onTotalChanged(budgetted);
            });
        },

        getBudgets: function() {
            var budgetsToCreateOrUpdate = this.rows()
                .filter(function(r) { return !r.isNewAndEmpty(); })
                .map(function(r) { return r.getBudget(); });

            return {
                budgetsToCreate: budgetsToCreateOrUpdate.filter(function(b) { return !b.budgetId; }),
                budgetsToUpdate: budgetsToCreateOrUpdate.filter(function(b) { return b.budgetId; }),
                budgetsToDelete: this.budgetsToDelete
            };
        },

        setBudgets: function(budgets) {
            var rows = budgets.map(function(b) { return new Row(b); });
            this.rows(rows);
        },

        newBudget: function(options) {
            var budget = {
                name: '',
                continueNextYear: true,
                rollover: false,
                budgetted: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                year: this.year,
                budgetType: this.budgetType,
                categoryId: this.categoryId
            };

            if (options) {
                if (options.name)
                    budget.name = options.name;

                if (options.amount) {
                    for (var i = 0; i < budget.budgetted.length; i++)
                        budget.budgetted[i] = options.amount;
                }
            }

            var newRow = new Row(budget, true);
            newRow.hasFocus(true);
            this.rows.push(newRow);
        },

        removeRow: function(row) {
            var budget = row.getBudget();
            if (budget.budgetId)
                this.budgetsToDelete.push(budget);

            this.rows.remove(row);
        },

        removeAllRows: function() {
            var me = this;
            this.rows().forEach(function(row) {
                var budget = row.getBudget();
                if (budget.budgetId)
                    me.budgetsToDelete.push(budget);
            });

            this.rows([]);
        },

        getErrors: function() {
            var isValid = this.rows()
                .filter(function(r) { return !r.isNewAndEmpty(); })
                .every(function (r) { return r.isValid(); });

            return isValid ? [] : ['Du skal give hver ' + (this.budgetType === 'income' ? 'indtægt' : 'regning') + ' et navn og et beløb.'];
        },

        resetBudgets: function(calculatedBudgets) {
            var me = this;

            this.removeAllRows();

            calculatedBudgets.forEach(function(budget) {
                me.rows.push(new Row(budget));
            });
        },

        afterRender: function(elements) {
            var me = this;
            var row = null;
            var startIndex = -1, endIndex = -1;
            var selectionState = false;

            var stateBefore = [];

            function updateMonthSelection() {
                var a = startIndex,
                    b = endIndex;
                if (endIndex < startIndex) {
                    a = endIndex;
                    b = startIndex;
                }

                for (var i = 0; i < 12; i++)
                    row.months[i].selected(a <= i && i <= b ? selectionState : stateBefore[i]);
            }

            function onStart(event) {
                event.preventDefault();

                var li = $(this);
                var ul = li.closest('ul');

                startIndex = li.index();
                endIndex = startIndex;
                row = me.rows()[li.closest('.budgedEditorRow').index()];

                stateBefore = row.months.map(function(m) { return m.selected(); });

                selectionState = !row.months[startIndex].selected();

                updateMonthSelection();
            }

            // TODO: Consider memory leakage if handler is not removed when component is disposed
            $('.budgetEditor')
                .off('click', '.months li')
                .on('click', '.months li', onStart);
        }
    });
});
