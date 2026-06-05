define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetListRow');
    var categoryService = require('services/categoryService');
    var utilities = require('utilities/utilities');
    var BudgetTooltip = require('./BudgetTooltip');
    var BudgetModal = require('../budgetModal/BudgetModal');
    var session = require('session');

    var ko = core.ko;

    var currentTooltip;

    function getStatusForMainCategory(fixedBudgetGroupViewModels, monthIndex) {
        var statuses = fixedBudgetGroupViewModels.map(function(fbg) { return fbg.months[monthIndex].status; });

        if (statuses.some(function(s) { return s === 'offBudget'; }))
            return 'offBudget';
        if (statuses.some(function(s) { return s === 'slightlyOffBudget'; }))
            return 'slightlyOffBudget';
        if (statuses.some(function(s) { return s === 'planned'; }))
            return 'planned';
        if (statuses.some(function(s) { return s === 'onBudget'; }))
            return 'onBudget';

        return 'none';
    }

    var monthNames = utilities.language.shortMonthNames;

    return core.Base.extend({
        template: template,

        constructor: function(budgetType, year, options, showRealizedAmount) {
            var isPeriodPast = year < new Date().getFullYear();
            this.budgetType = budgetType;
            this.year = year;

            this.categoryId = options.categoryId;
            this.name = options.name || (budgetType === 'consumptionLimit' ? 'Forbrugsloft' : categoryService.getCategoryNameById(options.categoryId));

            if (this.name === "Andre leveomkostninger")
                this.name = "Andre leve- omkostninger";

            this.showBudgetCount = budgetType === 'income' || budgetType === 'bill';

            this.clickBehaviour = options.clickBehaviour;
            this.isExpanded = ko.observable(false);
            this.isTonedDown = ko.observable(false);
            this.currency = session.currency;

            if (options.subRows) {
                this.showCategoryIcon = true;

                this.months = _.range(0, 12).map(function(index) {
                    var month = new Date(year, index, 1);
                    var status = getStatusForMainCategory(options.subRows, index);
                    var budget = options.subRows.sum(function(r) { return r.months[index].budget; });
                    var realized = options.subRows.sum(function(r) { return r.months[index].realized; });
                    return {
                        monthName: monthNames[index],
                        status: status,
                        warning: options.subRows.some(function(fbg) { return fbg.months[index].warning; }),
                        tooltipData: {
                            budgetType: budgetType,
                            categoryId: options.categoryId,
                            date: month,
                            budget: budget,
                            rollover: false,
                            originalBudget: budget,
                            transferred: 0,
                            realized: realized,
                            isFutureMonth: month.getTime() > new Date().getTime(),
                            status: status,
                            showPostings: false
                        }
                    };
                });

                this.budgetCount = options.subRows.sum(function(fbg) { return fbg.budgetCount; });

                this.amount = options.subRows.sum(function(fbg) { return fbg.amount; });

                this.subRows = options.subRows;

            } else {
                this.showCategoryIcon = false;

                this.months = _.range(0, 12).map(function(index) {
                    var month = new Date(year, index, 1);
                    var status = options.status[index].state.camelCase();
                    return {
                        monthName: monthNames[index],
                        status: status,
                        warning: options.status[index].warning,
                        budget: options.budgets[index],
                        realized: options.realized[index],
                        tooltipData: {
                            budgetType: budgetType,
                            categoryId: options.categoryId,
                            date: month,
                            budget: options.budgets[index],
                            originalBudget: options.budgets[index],
                            transferred: 0,
                            rollover: false,
                            realized: options.realized[index],
                            isFutureMonth: month.getTime() > new Date().getTime(),
                            status: status,
                            showPostings: true
                        }
                    };
                });

                this.budgetCount = options.budgetCount;
                this.amount = showRealizedAmount ? options.realized.slice(0, new Date().getMonth() + 1).average() : options.budgets.average();
            }
        },

        shouldAbortClick: function (event) {
            return core.isTouchDevice && $(event.target).parents().andSelf().is('.budgetTooltipTrigger');
        },

        click: function(o, event) {
            if (this.shouldAbortClick(event))
                return;

            if (this.clickBehaviour === 'expand') {
                var isExpanded = !this.isExpanded();
                this.isExpanded(isExpanded);
                return;
            }

            new BudgetModal({
                operation: 'edit',
                budgetType: this.budgetType,
                year: this.year,
                categoryId: this.categoryId
            }).open();
        },

        showTooltip: function(month, event) {
            if (!month.tooltipData)
                return;

            if (currentTooltip)
                currentTooltip.close();

            var tooltip = new BudgetTooltip(month.tooltipData);
            var target = $(event.target);
            tooltip.show(target.is('.budgetTooltipTrigger') ? target : target.closest('.budgetTooltipTrigger'));

            currentTooltip = tooltip;
        },

        toggleTooltip: function(month, event) {
            if (currentTooltip && currentTooltip.tooltipData === month.tooltipData)
                this.hideTooltip();
            else
                this.showTooltip(month, event);
        },

        hideTooltip: function() {
            if (!currentTooltip)
                return;

            currentTooltip.hideAfterTimeout();
            currentTooltip = null;
        },

        afterRender: function() {
            if (core.isTouchDevice) {
                $('.budgetList')
                    .on('click', '.budgetTooltipTrigger', function(event) {
                        var rowElement = $(this).closest('.row');
                        var row = ko.dataFor(rowElement.get(0));
                        if (rowElement.is('.expanded') || row.isTonedDown()) return;
                        var month = ko.dataFor(this);

                        row.toggleTooltip(month, event);
                    });
            } else {
                $('.budgetList')
                    .on('mouseenter', '.budgetTooltipTrigger', function(event) {
                        var rowElement = $(this).closest('.row');
                        var row = ko.dataFor(rowElement.get(0));
                        if (rowElement.is('.expanded') || row.isTonedDown()) return;
                        var month = ko.dataFor(this);

                        row.showTooltip(month, event);
                    })
                    .on('mouseleave', '.budgetTooltipTrigger', function() {
                        var rowElement = $(this).closest('.row');
                        var row = ko.dataFor(rowElement.get(0));

                        row.hideTooltip();
                    });
            }
        }
    });
});
