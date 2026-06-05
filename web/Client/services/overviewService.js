define(function(require) {
    var core = require('framework/core');
    var networkService = require('./networkService');
    var utilities = require('utilities/utilities');


    var incomeExpenseSummaryCache = { };
    var expenseCategorySummaryCache = { };
    var incomeCategorySummaryCache = { };
    var savingCategorySummaryCache = { };

    function clearCache() {
        incomeExpenseSummaryCache = {};
        expenseCategorySummaryCache = {};
        incomeCategorySummaryCache = {};
        savingCategorySummaryCache = {};
    }

    core.hub.on('postingsChanged', clearCache);

    return {
        getIncomeExpenseSummary: function(startMonth, endMonth) {
            var key = startMonth + '-' + endMonth;

            if (!incomeExpenseSummaryCache[key]) {
                incomeExpenseSummaryCache[key] = networkService
                    .ajaxGet('getIncomeExpenseSummary', { startMonth: startMonth, endMonth: endMonth })
                    .fail(clearCache)
                    .then(function(summary) {
                        if (summary) {
                            summary.months.forEach(function(report) {
                                report.shortMonth = utilities.formatMonth("%b", report.month);
                                report.shortMonthWithYear = utilities.formatMonth("%b %y", report.month);
                                report.longMonth = utilities.formatMonth("%B %Y", report.month);
                            });
                        }
                        return summary;
                    });
            }

            return incomeExpenseSummaryCache[key];
        },

        getExpenseCategorySummary: function(categoryId, startMonth, endMonth) {
            var key = categoryId + '-' + startMonth + '-' + endMonth;

            if (categoryId === null)
                categoryId = '';

            if (!expenseCategorySummaryCache[key]) {
                expenseCategorySummaryCache[key] = networkService
                    .ajaxGet('getExpenseCategorySummary', { categoryId: categoryId, startMonth: startMonth, endMonth: endMonth })
                    .fail(clearCache)
                    .then(function (result) {
                        if (result) {
                            result.summary.months.forEach(function(report) {
                                // TODO remove this from here (used for chart menus)
                                report.shortMonthWithYear = utilities.formatMonth("%b %y", report.month);
                            });
                        }
                        return result;
                    });
            }

            return expenseCategorySummaryCache[key];
        },

        getIncomeCategorySummary: function(startMonth, endMonth) {
            var key = startMonth + '-' + endMonth;
            if (!incomeCategorySummaryCache[key]) {
                incomeCategorySummaryCache[key] = networkService
                    .ajaxGet('getIncomeCategorySummary', { startMonth: startMonth, endMonth: endMonth })
                    .fail(clearCache)
                    .then(function (result) {
                        if (result) {
                            result.summary.months.forEach(function(report) {
                                // TODO remove this from here (used for chart menus)
                                report.shortMonthWithYear = utilities.formatMonth("%b %y", report.month);
                            });
                        }
                        return result;
                    });
            }

            return incomeCategorySummaryCache[key];
        },

        getSavingCategorySummary: function (startMonth, endMonth) {
            var key = startMonth + '-' + endMonth;
            if (!savingCategorySummaryCache[key]) {
                savingCategorySummaryCache[key] = networkService
                    .ajaxGet('getSavingCategorySummary', { startMonth: startMonth, endMonth: endMonth })
                    .fail(clearCache)
                    .then(function (result) {
                        if (result) {
                            result.summary.months.forEach(function (report) {
                                // TODO remove this from here (used for chart menus)
                                report.shortMonthWithYear = utilities.formatMonth("%b %y", report.month);
                            });
                        }
                        return result;
                    });
            }

            return savingCategorySummaryCache[key];
        }
    };
});
