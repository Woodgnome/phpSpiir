define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountList');
    var accountService = require('services/accountService');
    var AccountGroup = require('./accountGroup/AccountGroup');


    var ko = core.ko;

    var accountTypeTitles = {
        Consumption: 'Forbrugskonti',
        Loan: 'Lån',
        Savings: 'Låst opsparing'
    };

    var accountTypeSubTitles = {
        Loan: 'Poster indgår ikke i grafer og gns. og vises ikke på postersiden. Indbetalinger kategoriseres som den valgte kontotype. Fx. Boliglån, Billån.',
        Savings: 'Poster indgår ikke i grafer og gns. og vises ikke på postersiden. Indbetalinger kategoriseres som den valgte kontotype. Fx. Pensions- eller børneopsaring.'
    };

    var accountTypeOrder = {
        Consumption: 0,
        Loan: 1,
        Savings: 2
    };

    return core.Component.extend({
        template: template,
        constructor: function (accountFilter) {
            var me = this;

            this.accountGroups = this.registerDisposable(accountService.getAccountGroupsDataSource({ owner: this }));

            this.accountTypeViews = ko.observableArray();

            this.filter = accountFilter;

            this.filteredAccountGroups = ko.computed(function () {
                return this.accountGroups().filter(function (ag) {
                    if (me.filter() === 'active' && ag.inActive)
                        return false;

                    if (me.filter() === 'inactive' && !ag.inActive)
                        return false;

                    return true;
                });    
            }, this);

            this.showNoActiveAccountsMessage = ko.computed(function() {
                return this.filter() === 'active' && this.accountGroups().length > 0 && this.filteredAccountGroups().length === 0;
            }, this);

            this.filteredAccountGroups.subscribe(function (allAccountGroups) {
                var accountsByType = allAccountGroups.groupBy(function (g) { return g.accountType; });
                var accountTypeViews = _.map(accountsByType, function(accountGroups, accountType) {
                    return {
                        accountGroups: accountGroups
                            .sortBy(function (ag) { return -ag.endDate.getTime(); })
                            .map(function(ag) { return new AccountGroup(ag); }),
                        accountType: accountType,
                        order: accountTypeOrder[accountType],
                        title: accountTypeTitles[accountType],
                        subTitle: accountTypeSubTitles[accountType]
                    };
                });

                this.accountTypeViews(accountTypeViews.sortBy('order'));
            }, this);

            this.accountGroups.load();
        }
    });
});