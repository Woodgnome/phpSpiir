define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountPage');
    var accountService = require('services/accountService');
    var ImportModal = require('components/importModal/ImportModal');
    var AccountList = require('./accountList/AccountList');
    var AccountSidebar = require('./accountSidebar/AccountSidebar');
    var session = require('session');

    var ko = core.ko;

    return core.Page.extend({
        template: template,

        title: 'Konti',

        navigationId: 'account',

        routes: [
            { id: 'account-index', url: '', action: 'index' }
        ],

        //subNavigation: {
        //    items: [
        //        { title: 'Poster', routeId: 'server:Posting_Index' },
        //        { title: 'Konti', routeId: 'account-index' }
        //    ],
        //    defaultItem: 'account-index'
        //},

        constructor: function() {
            var me = this;

            this.hasAccounts = ko.observable(session.user.hasPostings);
            this.processing = ko.processingObservable();
            this.accountFilter = ko.observable('active');

            this.mobileAppRequired = !session.enableEnterpriseAis && session.enableUnlicensedAis;
            this.bankSyncEnabled = !session.bankSyncDisabled;
            this.bankSyncDisabledReason = session.bankSyncDisabled;

            this.accountList = this.registerDisposable(new AccountList(this.accountFilter));
            this.accountSidebar = this.registerDisposable(new AccountSidebar(this.mobileAppRequired));

            this.accountGroups = this.registerDisposable(accountService.getAccountGroupsDataSource({ owner: this, autoLoad: true }));

            this.accountGroups.subscribe(function(accountGroups) {
                me.hasAccounts(accountGroups.length > 0);
            });

                this.hasInActiveAccounts = ko.computed(function () {
                    var hasInActiveAccounts = this.accountGroups().some(function (ag) { return ag.inActive; });

                    if (!hasInActiveAccounts) {
                        this.changeFilter('active');
                    }

                    return hasInActiveAccounts;
                }, this);

            this.base();
        },

        index: function(options) {
            var me = this;

            if (options.addNewBank) {
                this.app.navigate('account-index', null, { trigger: false, replace: true }); // Remove the query string from the URL

                this.app.addModalTask(function() {
                    me.addNewBank();
                });
            }
        },

        addNewBank: function() {
            if (this.mobileAppRequired) {
                ImportModal.showMobileAppRequiredModal();
            } else {
                ImportModal.showAddBankModal();
            }
        },

        changeFilter: function(filter) {
            this.accountFilter(filter);
        }
    });
});
