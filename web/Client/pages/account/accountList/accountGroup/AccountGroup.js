define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountGroup');
    var accountService = require('services/accountService');
    var AccountModal = require('../../accountModal/AccountModal');
    var session = require('session');

        return core.Base.extend({
            template: template,

            constructor: function(accountGroupDto) {
                _.extend(this, accountGroupDto);
                this.accountGroupDto = accountGroupDto;
                this.accountGroupId = accountGroupDto.id;
                this.isAutomatic = accountGroupDto.isAutomatic;
                this.name = accountGroupDto.name;
                this.bankName = accountGroupDto.bankName || 'Ukendt bank';
                this.accountTypeFormatted = accountService.formatAccountType(this.accountType, this.accountSubcategoryId);
                this.hasBalance = typeof this.balance !== 'undefined';
                this.cssClass = this.accountType.camelCase();
                this.currency = session.currency;
            },

            click: function () {
                new AccountModal(this.accountGroupDto).open();
            }
        });
    });
