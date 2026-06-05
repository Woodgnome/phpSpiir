define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountSidebar');
    var accountService = require('services/accountService');
    var AccountSidebarBank = require('./AccountSidebarBank');

        return core.Component.extend({
            template: template,

            constructor: function(mobileAppRequired) {
                this.mobileAppRequired = mobileAppRequired;
                this.banks = this.registerDisposable(accountService.getUserBankDataSource());
                this.bankViews = core.utils.observableMapNew(this.banks, AccountSidebarBank);
            },
        });
    });
