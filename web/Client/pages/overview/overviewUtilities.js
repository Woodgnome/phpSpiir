define(function(require) {
    var core = require('framework/core');
    var config = require('config');
    var session = require('session');



    function periodIsEqual(otherPeriod) {
        return otherPeriod && this.startMonth === otherPeriod.startMonth && this.endMonth === otherPeriod.endMonth;
    }

    return {
        getSubNavigation: function(defaultItem) {
            var subNavigationItems = [];

            if (session.user.hasPostings) {
                subNavigationItems = [
                    { title: 'Overblik', routeId: 'overview-index' },
                    { title: 'Udgifter', routeId: 'category-expenses-all' },
                    { title: 'Indkomst', routeId: 'category-income' },
                    { title: 'Opsparing', routeId: 'category-saving' },
                ];
            }

            return {
                defaultItem: defaultItem,
                items: subNavigationItems
            };
        },

        getPeriodItems: function() {
            var items = [];
            var user = session.user;

            function addItem(totalTitle, label, startMonth, endMonth) {
                items.push({ totalsTitle: totalTitle, label: label, startMonth: startMonth.toMonthString(), endMonth: endMonth.toMonthString(), isEqual: periodIsEqual });
            }

            var currentMonth = new Date();
            var firstYearWithPostings = user.oldestPosting ? Date.fromIsoDate(user.oldestPosting).getFullYear() : new Date().getFullYear();

            addItem('Sidste 12 mdr.', '12 mdr.', currentMonth.addMonths(-12), currentMonth);

            for (var year = currentMonth.getFullYear(); year >= firstYearWithPostings; year--)
                addItem(year, year, new Date(year, 0, 1), new Date(year, 11, 1));

            return items;
        }
    };
});