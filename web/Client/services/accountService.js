define(function(require) {
    var core = require('framework/core');
    var config = require('config');
    var networkService = require('services/networkService');
    var ko = require('lib/knockout');
    var categoryService = require('services/categoryService');
    var dataSourceFactory = require('services/dataSourceFactory');
    var session = require('session');


    var WelcomeWizardAccountGroup = function(accountGroup) {
        this.id = ko.observable(null);
        this.name = ko.observable('');
        this.accountTypeCombined = ko.observable(null);
        this.accountTypeExplicitlySet = ko.observable(false);

        this.accountType = ko.dependentObservable(function() {
            var accountTypeCombined = this.accountTypeCombined();
            if (!accountTypeCombined)
                return null;
            return accountTypeCombined.split('|')[0];
        }, this);

        this.accountSubcategoryId = ko.dependentObservable(function() {
            var accountTypeCombined = this.accountTypeCombined();
            if (!accountTypeCombined)
                return null;
            return accountTypeCombined.split('|')[1] || null;
        }, this);

        if (accountGroup)
            this.updateWithServerAccountGroup(accountGroup);
    };

    WelcomeWizardAccountGroup.prototype = {
        updateWithServerAccountGroup: function(accountGroup) {
            this.id(accountGroup.id);
            this.name(accountGroup.name);

            if (accountGroup.accountType)
                this.accountTypeCombined(accountGroup.accountType + (accountGroup.accountSubcategoryId ? '|' + accountGroup.accountSubcategoryId : ''));
            else
                this.accountTypeCombined(null);

            this.accountTypeExplicitlySet(accountGroup.accountTypeExplicitlySet);
        }
    };

    var accountGroupsCached = null,
        banksCached = null;

    function postAccountGroupsChangedMessage() {
        accountGroupsCached = null;
        banksCached = null;
        core.hub.post('accountGroupsChanged');
        core.hub.post('postingsChanged');
    }

    core.hub.on('postingsImported', postAccountGroupsChangedMessage);

    var userBanks = ko.observableArray();

    var accountService = {
        fireAccountGroupsChanged: postAccountGroupsChangedMessage,

        getAccountGroups: function() {
            if (accountGroupsCached === null) {
                accountGroupsCached = networkService
                    .ajaxGet('getAccountGroups')
                    .then(function(accountGroups) {
                        accountGroups.forEach(function(ag) {
                            ag.startDate = Date.fromIsoDate(ag.startDate);
                            ag.endDate = Date.fromIsoDate(ag.endDate);
                            ag.lastUpdated = ag.lastUpdated ? Date.fromIsoDate(ag.lastUpdated) : null;

                            ag.periods.forEach(function(p) {
                                p.startDate = Date.fromIsoDate(p.startDate);
                                p.endDate = Date.fromIsoDate(p.endDate);
                                p.ignorePostingsBefore = p.ignorePostingsBefore ? Date.fromIsoDate(p.ignorePostingsBefore) : null;
                                p.ignorePostingsAfter = p.ignorePostingsAfter ? Date.fromIsoDate(p.ignorePostingsAfter) : null;
                            });
                        });

                        return accountGroups;
                    });
            }
            return accountGroupsCached;
        },

        getAccountGroupsThatPeriodCanBeMovedTo: function(period) {
            // The rules implemented here should correspond to the guards in AccountService.MoveAccountToGroup.

            function periodIsFullyContained(otherPeriod) {
                if (period.startDate <= otherPeriod.startDate && otherPeriod.endDate <= period.endDate)
                    return true;

                if (otherPeriod.startDate <= period.startDate && period.endDate <= otherPeriod.endDate)
                    return true;

                return false;
            }

            return this.getAccountGroups()
                .then(function(accountGroups) {
                    var groupForAccount = accountGroups.find(function(ag) {
                        return ag.periods.some(function(p) { return p.accountId === period.accountId; });
                    });

                    return accountGroups.filter(function(ag) {
                        if (ag.accountType !== groupForAccount.accountType)
                            return false;

                        if (ag === groupForAccount)
                            return false;

                        if (period.isAutomatic && ag.isAutomatic)
                            return false;

                        var somePeriodIsContainedWithinAnother = ag.periods
                            .filter(function(p) { return !p.isAutomatic; })
                            .some(periodIsFullyContained);

                        if (somePeriodIsContainedWithinAnother)
                            return false;

                        return true;
                    });
                });
        },

        getAccountGroupsThatNewAutomaticAccountCanBeMovedTo: function() {
            return this.getAccountGroups()
                .then(function(accountGroups) {
                    return accountGroups.filter(function (ag) { return !ag.isAutomatic; });
                });
        },

        getBanks: function() {
            if (banksCached === null)
                banksCached = networkService.ajaxGet('getBanks');

            return banksCached;
        },

        getBank: function(bankId) {
            return this.getBanks()
                .then(function (banks) {
                    return banks.filter(function (b) { return b.id === bankId; })[0];
                });
        },

        getBankDataSource: function(options) {
            return dataSourceFactory.create({
                load: this.getBanks.bind(this),
                owner: options.owner,
                reloadOn: [
                    [core.hub, 'accountGroupsChanged']
                ]
            });
        },

        getUserBankDataSource: function() {
            if (!this._userBankDataSourceConfigured) {
                this._userBankDataSourceConfigured = true;
                var loadUserBanks = function() {
                    $.when(accountService.getBanks(), accountService.getAccountGroups())
                        .then(function(banks, accountGroups) {
                            var bankIds = accountGroups.toObject('bankId');
                            var accountGroupsByBank = accountGroups.groupBy('bankId');

                            banks = banks.filter(function(b) { return bankIds[b.id]; });

                            banks.forEach(function(b) {
                                var mostRecentlyUpdatedAccountGroup = accountGroupsByBank[b.id].max('lastUpdated');

                                b.lastUpdated = mostRecentlyUpdatedAccountGroup ? mostRecentlyUpdatedAccountGroup.lastUpdated : null;
                                b.hasAutomaticAccounts = accountGroupsByBank[b.id].some(function(ag) { return ag.isAutomatic; });
                                b.hasManualAccounts = accountGroupsByBank[b.id].some(function(ag) { return !ag.isAutomatic; });
                                b.hasOnlyPartnerAccounts = accountGroupsByBank[b.id].every(function (ag) { return ag.partnerId; });
                                b.hasOnlyInActiveAccounts = accountGroupsByBank[b.id].every(function (ag) { return ag.inActive; });
                            });

                            userBanks(banks);
                        });
                };
                loadUserBanks();
                core.hub.on('accountGroupsChanged', loadUserBanks);
            }

            // Return a new computed to prevent unknown subscriptions to userBanks. Only one subscription
            // to userBanks is registered, and the caller only needs to dispose the computed to unsubscribe.
            return ko.computed(function() {
                return userBanks();
            }, this);
        },

        getAccountGroupsDataSource: function(options) {
            return dataSourceFactory.create({
                load: this.getAccountGroups.bind(this),
                owner: options.owner,
                autoLoad: options.autoLoad,
                reloadOn: [
                    [core.hub, 'accountGroupsChanged']
                ]
            });
        },

        moveAccountToGroup: function(accountId, accountGroupId) {
            return networkService
                .ajaxPost('moveAccountToGroup', {
                    accountId: accountId,
                    accountGroupId: accountGroupId
                })
                .then(postAccountGroupsChangedMessage);
        },

        moveAccountToNewAccountGroup: function(accountId, name) {
            return networkService
                .ajaxPost('moveAccountToNewAccountGroup', {
                    accountId: accountId,
                    name: name
                })
                .then(postAccountGroupsChangedMessage);
        },

        formatAccountType: function(accountType, accountSubcategoryId) {
            if (accountType === 'Consumption') {
                var consumptionType = session.accountTypeOptions.find(x => x.value === 'Consumption');
                return consumptionType ? consumptionType.label : 'Forbrug';
            }

            if (accountSubcategoryId)
                return categoryService.getSubcategoryNameById(accountSubcategoryId);

            return accountType;
        },

        deleteAccount: function(accountId) {
            return networkService
                .ajaxPost('deleteAccount', { accountId: accountId })
                .then(postAccountGroupsChangedMessage);
        },

        deleteAccountGroup: function(accountGroupId) {
            var me = this;
            return networkService
                .ajaxPost('deleteAccountGroup', { accountGroupId: accountGroupId })
                .then(function() {
                    return me.getAccountGroups().then(function(accountGroups) {
                        session.user.hasPostings = accountGroups.filter(function(ag) { return ag.id !== accountGroupId; }).length > 0;
                    });
                })
                .then(postAccountGroupsChangedMessage);
        },

        updateAccountGroup: function(accountGroupId, name, accountType, accountSubcategoryId, bankId) {
            return networkService
                .ajaxPost('updateAccountGroup', {
                    accountGroupId: accountGroupId,
                    name: name,
                    accountType: accountType,
                    accountSubcategoryId: accountSubcategoryId,
                    bankId: bankId
                })
                .then(postAccountGroupsChangedMessage);
        },

        closeAccountGroup: function(accountGroupId) {
            return networkService
                .ajaxPost('closeAccountGroup', { accountGroupId: accountGroupId })
                .then(postAccountGroupsChangedMessage);
        },

        reopenAccountGroup: function (accountGroupId) {
            return networkService
                .ajaxPost('reopenAccountGroup', { accountGroupId: accountGroupId })
                .then(postAccountGroupsChangedMessage);
        },

        configureUploaderAccounts: function(actions) {
            if (actions.length === 0) {
                postAccountGroupsChangedMessage();
                return $.Deferred().resolve();
            }

            return networkService.ajaxPost('configureUploaderAccounts', actions)
                .then(postAccountGroupsChangedMessage);
        },

        getBalanceHistory: function(accountGroupId) {
            return networkService.ajaxGet('getBalanceHistory', { accountGroupId: accountGroupId });
        },

        enableNewLsbIntegration: function (bankId) {
            return networkService.ajaxPost('enableNewLsbIntegration', {})
                .then(postAccountGroupsChangedMessage);
        }
    };

    return accountService;
});
