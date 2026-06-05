define(function(require) {
    var core = require('framework/core');
    var template = require('template!SimpleBudgetEditor');
    var DisposableAmountInfo = require('./DisposableAmountInfo');
    var session = require('session');

    var ko = core.ko;

    function createBudgetArray(value) {
        return _.range(0, 12).map(function() { return value; });
    }

    return core.Base.extend({
        template: template,

        constructor: function(options) {
            var me = this;

            options = _.extend({
                budgetted: [],
                categoryId: null,
                budgetType: null,
                year: 0,
                onTotalChanged: function() {
                }
            }, options);

            this.budget = null;
            this.budgetIsNew = ko.observable(false);
            this.currency = session.currency;

            this.year = options.year;
            this.categoryId = options.categoryId;
            this.budgetType = options.budgetType;
            this.onTotalChanged = options.onTotalChanged;

            this.rollover = ko.observable(false);

            this.value = ko.numericObservable(0, {});
            this.budgetted = ko.observable(createBudgetArray(0));
            this.budgettedOriginal = createBudgetArray(0);

            this.totalBudgetted = ko.computed(function() {
                return this.budgetted();
            }, this).extend({ throttle: 300 });

            this.onTotalChanged(this.totalBudgetted());

            this.totalBudgetted.subscribe(function(budgetted) {
                me.onTotalChanged(budgetted);
            });

            this.monthIndex = ko.observable(new Date().getMonth());

            this.applyValueToFuture = ko.computed(function() {
                if (this.budgetIsNew())
                    return true;

                var startOfCurrentMonth = new Date().getStartOfMonth();
                var selectedMonth = new Date(this.year, this.monthIndex(), 1);
                return selectedMonth.getTime() >= startOfCurrentMonth.getTime();
            }, this);

            this.valueLabel = ko.computed(function() {
                var monthName = new Date(this.year, this.monthIndex(), 1).format('%B');
                if (this.applyValueToFuture()) {
                    return this.budgetIsNew() && this.monthIndex() === 0
                        ? 'I <strong>' + this.year + '</strong> vil jeg bruge'
                        : 'Fra og med <strong>' + monthName + '</strong> vil jeg bruge';
                } else
                    return 'I <strong>' + monthName + '</strong> vil jeg bruge';
            }, this);

            this.value.subscribe(function(newValue) {
                var budgetted = this.budgetted();

                var previousMonthValue = budgetted[this.monthIndex()];

                if (previousMonthValue === newValue)
                    return;

                if (this.applyValueToFuture()) {
                    for (var i = this.monthIndex(); i < 12; i++)
                        budgetted[i] = newValue;
                } else {
                    budgetted[this.monthIndex()] = newValue;
                }

                this.budgetted(budgetted);
            }, this);


            this.disposableAmountInfo = null;
            if (this.budgetType === 'consumptionLimit') {
                this.disposableAmountInfo = new DisposableAmountInfo(this.year);
                this.value.subscribe(this.disposableAmountInfo.consumptionLimit);
            }
        },

        setMonth: function(month) {
            var date = Date.fromMonth(month);
            if (date.getFullYear() !== this.year)
                throw new Error('SimpleBudgetEditor.setMonth: Cannot change year');

            this.monthIndex(date.getMonth());
            this.value(this.budgetted()[this.monthIndex()]);
        },

        getBudgets: function() {
            var me = this;

            var budget = _.extend({}, this.budget, {
                budgetted: this.budgetted(),
                rollover: this.rollover()
            });

            var budgets = {
                budgetsToCreate: [],
                budgetsToUpdate: [],
                budgetsToDelete: []
            };

            if (budget.budgetId) {
                var budgetHasChanged = _.range(0, 12).some(function(i) { return budget.budgetted[i] !== me.budgettedOriginal[i]; })
                    || budget.rollover !== this.rolloverOriginal;

                var lastMonthChanged = budget.budgetted[11] !== this.budgettedOriginal[11];

                if (budgetHasChanged) {
                    if (!budget.continueNextYear && lastMonthChanged)
                        budget.continueNextYear = true;
                    budgets.budgetsToUpdate.push(budget);
                }
            } else
                budgets.budgetsToCreate.push(budget);

            return budgets;
        },

        setBudgets: function(budgets) {
            if (budgets.length > 1)
                throw new Error('setBudgets: Multiple budgets not allowed.');

            this.budget = budgets[0] || null;
            this.budgetted(this.budget ? this.budget.budgetted : createBudgetArray(0));

            this.budgettedOriginal = [].concat(this.budgetted());
            this.rolloverOriginal = this.budget ? this.budget.rollover === true : false;

            this.rollover(this.rolloverOriginal);
            this.value(this.budgetted()[this.monthIndex()]);
        },

        newBudget: function(options) {
            if (this.budget)
                throw new Error('newBudget: Budget already created');

            var amount = options && options.amount ? options.amount : 0;

            var budget = {
                name: '',
                continueNextYear: true,
                rollover: false,
                budgetted: createBudgetArray(amount),
                year: this.year,
                budgetType: this.budgetType,
                categoryId: this.categoryId
            };

            this.budgetIsNew(true);
            this.setBudgets([budget]);
        },

        getErrors: function() {
            if (this.budgetted().every(function(b) { return b === 0; }))
                return ['Du har ikke budgetteret med noget. Venligst indtast hvor meget du ønsker at bruge.'];

            return [];
        },

        resetBudgets: function() {
            throw new Error('resetBudgets not supported');
        }
    });
});
