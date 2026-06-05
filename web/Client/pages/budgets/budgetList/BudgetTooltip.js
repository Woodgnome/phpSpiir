define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetTooltip');
    var budgetService = require('services/budgetService');
    var categoryService = require('services/categoryService');
    var config = require('config');
    var ChartTooltipBase = require('components/ChartTooltipBase');
    var session = require('session');

    return core.IndependentComponent.extend({
        template: template,

        constructor: function (tooltipData) {
            var me = this;
            _.extend(this, tooltipData);
            this.tooltipData = tooltipData;

            this.showTwoColumns = !this.isFutureMonth;
            this.numberOfPostings = ko.observable(0);
            this.hasMorePostings = ko.observable(false);
            this.showPostingsLink = ko.observable(this.budgetType != 'consumptionRest');
            this.currency = session.currency;

            this.fixedBudgets = ko.observableArray();
            this.postings = ko.observableArray();
            this.addToDom({ hidden: true });

            _.bindAll(this, '_position');

            if (this.budgetType === 'bill' || this.budgetType === 'income') {
                budgetService
                    .getBudgets(tooltipData.categoryId, tooltipData.date.getFullYear())
                    .then(function (budgets) {
                        return budgets
                            .map(function (b) {
                                return {
                                    name: b.name,
                                    budgetMonth: b.budgetted[tooltipData.date.getMonth()]
                                };
                            })
                            .filter(function (b) {
                                return b.budgetMonth !== 0;
                            });
                    })
                    .then(this.fixedBudgets)
                    .then(this._position);
            }

            if (this.showPostings) {
                budgetService
                    .getPostings(tooltipData.date.toMonthString(), tooltipData.categoryId)
                    .then(function (postings) {
                        var sortOrder = me.budgetType === 'income' ? -1 : 1;
                        var sortedPostings = postings.sortBy(function (p) { return sortOrder * p.amount; });

                        me.numberOfPostings(postings.length);
                        var sliced = false;
                        if (sortedPostings.length > 5) {
                            sortedPostings = sortedPostings.slice(0, 5);
                            sliced = true;
                        }

                        me.hasMorePostings(sliced);

                        me.postings(sortedPostings);
                    })
                    .then(this._position);
            }
        },

        show: function (parent) {
            var me = this;

            this.positionTooltip(parent);

            this.element
                .bind('mouseleave', function () { me.hideAfterTimeout(); })
                .bind('mouseenter', function () { clearTimeout(me.hideTimeout); })
                .bind('click', function (event) { event.stopPropagation(); });

            $(document).one('click', function () { me.close(); });
        },

        positionTooltip: function (parent) {
            this.parentElement = parent;
            this._position();
        },

        _position: function () {
            if (!this.parentElement || !this.element)
                return;

            var parentOffset = this.parentElement.offset();
            var parentWidth = this.parentElement.outerWidth();

            ChartTooltipBase.positionAndShowTooltip({ element: this.element, x: parentOffset.left + parentWidth / 2, y: parentOffset.top, spaceAbove: 30, spaceBelow: 50 });
        },

        hideAfterTimeout: function () {
            var me = this;
            this.hideTimeout = setTimeout(function () {
                if (me.element) {
                    me.element.fadeOut('fast', function () {
                        me.close();
                    });
                } else {
                    me.close();
                }
            }, 300);
        },

        close: function () {
            this.dispose();
        },

        goToPostings: function () {
            var params = { fromMonth: this.date.toMonthString(), toMonth: this.date.toMonthString() };

            if (this.categoryId) {
                if (categoryService.isMainCategoryId(this.categoryId))
                    params.categoryIds = this.categoryId;
                else
                    params.subcategoryIds = this.categoryId;
            } else if (this.budgetType === 'consumptionLimit') {
                params.expenseType = 'Variable';
            }

            var url = config.urls.postings + '?' + $.param(params);
            location.assign(url);
        }
    });
});
