define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountSidebarBank');
    var ImportModal = require('components/importModal/ImportModal');
    var mobileBankApiService = require('services/mobileBankApiService');
    var session = require('session');

    return core.Component.extend({
        template: template,

        constructor: function (bank) {
            this.bank = bank;
            _.extend(this, bank);
            this.processing = ko.processingObservable();
            this.bankCredentials = ko.observableArray(bank.bankCredentials);
            this.bankApiDisabledMesssage = bank.bankApiDisabledMesssage || session.bankSyncDisabled;

            this.disableSyncButtons = ko.computed(function() {
                return this.bankApiDisabledMesssage || this.processing();
            }, this);
        },

        updateManualBank: function() {
            ImportModal.showManualImportModal(this.bank);
        },

        updateAutomaticBank: function (bankCredential) {
            ImportModal.updateAutomaticBank(this.bank, bankCredential.id, bankCredential.supportsUnattended);
        },

        loginToAutomaticBank: function() {
            var onlyAlreadyConnectedAccounts = this.hasAutomaticAccounts;
            ImportModal.loginToAutomaticBank(this.bank, onlyAlreadyConnectedAccounts);
        },

        addAccounts: function (bankCredential) {
            ImportModal.addAccounts(this.bank, bankCredential.id, bankCredential.supportsUnattended);
        },

        removeSavedCredentials: function(bankCredential) {
            if (!confirm('Er du sikker på, at du ønsker at logge ud af banken?\n(Du kan logge på igen senere.)'))
                return;

            this.bankCredentials.remove(bankCredential);
            mobileBankApiService.removeSavedCredentials(this.bank.id, bankCredential.id);
        }
    });
});