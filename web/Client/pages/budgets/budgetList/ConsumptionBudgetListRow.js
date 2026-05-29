define(function(require) {
    var core = require('framework/core');
    var template = require('template!ConsumptionBudgetListRow');
    var categoryService = require('services/categoryService');
    var utilities = require('utilities/utilities');
    var BudgetTooltip = require('./BudgetTooltip');
    var BudgetModal = require('../budgetModal/BudgetModal');
    var BudgetListRow = require('./BudgetListRow');
    var session = require('session');


    var calculateBarWidth = function (realized, budget) {
        if (budget === 0)
            return 0;

        var ratio = Math.max(0, Math.min(1, realized / budget));
        if (ratio > 0.99) ratio = 1;
        else if (ratio > 0.97) ratio = 0.97;
        else if (0 < ratio && ratio < 0.03) ratio = 0.03;

        return ratio;
    };

    var monthNames = utilities.language.monthNames;

    var shortMonthNames = utilities.language.shortMonthNames;

    return BudgetListRow.extend({
        template: template,

        constructor: function(budgetType, year, options) {
            var now = new Date();
            if (year !== now.getFullYear())
                throw new Error('ConsumptionBudgetListRow: Year must be current year'); // TODO: Remove year parameter

            var selectedMonthIndex = now.getMonth();
            this.year = year;
            this.budgetType = budgetType;
            this.categoryId = options.categoryId;
            this.isLimit = budgetType === 'consumptionLimit';
            this.isConsumptionRest = budgetType === 'consumptionRest';
            this.status = options.status[selectedMonthIndex].state.camelCase();
            this.name = options.name || (this.isLimit ? 'Forbrugsloft' : this.isConsumptionRest ? 'Resten' : categoryService.getCategoryNameById(options.categoryId));
            this.selectedMonthIndex = selectedMonthIndex;
            this.isRollover = options.rollover;
            this.currency = session.currency;

            this.isExpanded = ko.observable(false);
            this.isTonedDown = ko.observable(false);
            this.clickBehaviour = options.clickBehaviour;

            var startMonthIndex = Math.max(0, selectedMonthIndex - 3);

            var months = _.range(startMonthIndex, selectedMonthIndex + 1).map(function(index) {
                var month = new Date(year, index, 1);
                var status = options.status[index].state.camelCase();

                return {
                    selected: index === selectedMonthIndex,
                    monthName: monthNames[index],
                    shortMonthName: shortMonthNames[index],
                    status: status,
                    warning: options.status[index].warning,
                    budget: options.budgets[index],
                    realized: options.realized[index],
                    barWidth: calculateBarWidth(options.realized[index], options.budgets[index]),
                    tooltipData: {
                        budgetType: budgetType,
                        categoryId: options.categoryId,
                        date: month,
                        budget: options.budgets[index],
                        originalBudget: options.originalBudgets[index],
                        realized: options.realized[index],
                        transferred: options.transferred[index],
                        rollover: options.rollover,
                        isFutureMonth: month.getTime() > new Date().getTime(),
                        status: status,
                        showPostings: true
                    }
                };
            });


            this.realized = options.realized[selectedMonthIndex];
            this.budget = options.budgets[selectedMonthIndex];
            this.remaining = this.budget - this.realized;


            this.lastMonths = months.slice(0, months.length - 1);
            this.currentMonth = months[months.length - 1];
            this.currentMonth.title = this.getBarText(this.currentMonth);
            this.currentMonth.showToday = this.isLimit;
            this.currentMonth.todayLocation = this.getTodayLocation();
            this.currentMonth.todayText = new Date().format('%e. %b');

            this.amount = options.budgets[selectedMonthIndex];
            this.averageAmount = options.budgets.average();
            this.averageLabel = 'GNS.';

            this.restSubcategories = [];
            if(this.isConsumptionRest) {
                _.bindAll(this, 'restClick');

                this.restSubcategories = options.subcategoriesWithoutBudgets
                    .map(function(sc) {
                        return {
                            mainCategoryName: sc.categoryId !== '-1' ? categoryService.getCategoryNameById(categoryService.getMainCategoryId(sc.categoryId)) : null,
                            subCategoryName: categoryService.getCategoryNameById(sc.categoryId),
                            amount: sc.realized[new Date().getMonth()],
                            categoryId: sc.categoryId
                        };
                    })
                    .filter(function(o) { return o.amount != 0; })
                    .sortBy(function (o) { return -o.amount; });
            }
        },

        getTodayLocation: function() {
            var now = new Date();
            var numberOfDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            return (now.getDate() - .5) / numberOfDaysInMonth;
        },

        getBarText: function(month) {
            var realized = this.realized.formatPrice();
            var budget = (this.budget > 0 ? this.budget : 0).formatPrice();

            if (this.isLimit) {
                return 'Du har brugt <strong>' + realized + '</strong> ' + this.currency.symbol + ' af ialt <strong>' + budget + '</strong> ' + this.currency.symbol + ' i ' + month.monthName;
            } else {
                return 'Du har brugt <strong>' + realized + '</strong> ' + this.currency.symbol + ' ud af <strong>' + budget + '</strong> ' + this.currency.symbol + ' i ' + month.monthName;
            }
        },

        restClick: function (restSubcategory) {
            if (restSubcategory.categoryId === "-1")
                return;

            new BudgetModal({
                operation: 'create',
                year: new Date().getFullYear(),
                categoryId: restSubcategory.categoryId,
                budgetType: 'consumption',
                newBudget: {
                    amount: restSubcategory.averageAmount
                }
            }).open();
        }
    });
});
