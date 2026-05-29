define(function(require) {
    var core = require('framework/core');
    var template = require('template!NewAccountConfiguration');
    var accountService = require('services/accountService');
    var session = require('session');

    var AccountTypeTooltip = require('components/accountTypeTooltip/AccountTypeTooltip');


    return core.Component.extend({
        template: template,

        constructor: function(accountId, accountGroupId) {
            this.accountId = accountId;
            this.accountGroupId = accountGroupId;

            this.accountType = ko.observable();
            this.accountSubcategoryId = ko.observable();

            this.accountTypeOptions = session.accountTypeOptions;
            this.accountTypeValue = ko.computed({
                read: function() {
                    return this.accountType() + (this.accountSubcategoryId() ? '|' + this.accountSubcategoryId() : '');
                },
                write: function(value) {
                    var parts = value.split('|');
                    this.accountType(parts[0]);
                    this.accountSubcategoryId(parts[1]);
                },
                owner: this
            });

            this.accountTypeTooltip = this.registerDisposable(new AccountTypeTooltip());

            this.isValid = ko.computed(function() {
                return !!this.accountType();
            }, this);

            this.isValid.subscribe(function (isValid) {
                this.trigger('isValidChanged', isValid);
            }, this);
        },

        getAction: function() {
                return {
                    accountGroupId: this.accountGroupId,
                    accountType: this.accountType(),
                    accountSubcategoryId: this.accountSubcategoryId()
            }
        },

        onAccountTypeFocus: function(data, event) {
            this.accountTypeTooltip.show(event.target);
        },

        onAccountTypeBlur: function() {
            this.accountTypeTooltip.hideAfterTimeout(100);
        }
    });
});
