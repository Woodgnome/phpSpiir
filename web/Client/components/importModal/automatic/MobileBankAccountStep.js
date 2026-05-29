define(function(require) {
    var core = require('framework/core');
    var template = require('template!MobileBankAccountStep');
    var Step = require('components/wizard/Step');
    var MobileBankSyncStep = require('./MobileBankSyncStep');
    var session = require('session');

    var topThis;

    return Step.extend({
        template: template,
        showActions: false,

        constructor: function () {
            topThis = this;

            this.base.apply(this, arguments);

            this.assertInWizardState('bank');

            this.accounts = ko.observableArray();
            this.mergeCandidates = ko.observableArray();
            this.tooltip = ko.observable();
            this.totalAccounts = ko.observable(0);

            this.bank = this.wizardState.bank;
            this.bankAccountToCandidateMap = {};

            this.currency = session.currency;

            this.selectedAccounts = ko.computed(
                function () {
                    return _.filter(this.accounts(), function (a) { return a.selected(); });
                }, this);

            this.canContinue = ko.computed(
                function () {
                    return this.selectedAccounts().length > 0;
                }, this);

            this.nextTooltip = ko.computed(
                function () {
                    return this.canContinue() ? '' : 'Vælg mindst en konto før du går videre.';
                }, this);

            this.shouldDisableContinue = ko.computed(
                function () {
                    return this.accounts().filter(function(a) {
                        return a.selected() && a.accountIsNew && topThis.mergeCandidates().length > 0 && (a.mergeWithExisting() === null || (a.mergeWithExisting() === 'true' && !a.existingAccountToMerge()));
                    }).length > 0;
                }, this);
        },

        beforeShowing: function () {
            this.assertInWizardState('mobileBankApiAccounts');

            var me = this;

            var accountModels =
                _.filter(this.wizardState.mobileBankApiAccounts, function (e) { return !me.wizardState.syncOnlyNewAccounts || e.isNew; })
                    .map(
                        function (account) {
                            return {
                                externalAccountId: account.externalAccountId,
                                accountIsNew: account.isNew,
                                name: account.accountName,
                                balance: account.balance,
                                selected: ko.observable(me.wizardState.onlyAlreadyConnectedAccounts || !account.isNew),
                                mergeWithExisting: ko.observable(null), // values: null, 'true' or 'false' (notice strings, not booleans. 'CheckedValue' for radio buttons is not supported in Knockout 2.3)
                                existingAccountToMerge: ko.observable(null)
                            };
                        });

            this.accounts(accountModels);

            this.totalAccounts(this.wizardState.mobileBankApiAccounts.length);

            var mergeCandidateModels = this.wizardState.mergeCandidates
                .map(
                    function (mergeCandidate) {
                        return {
                            accountId: mergeCandidate.accountId,
                            name: mergeCandidate.name,
                            balance: mergeCandidate.balance,
                            accountNumber: mergeCandidate.accountNumber,
                            selected: ko.observable(false)
                        };
                    });

            this.mergeCandidates(mergeCandidateModels);
        },

        complete: function (callback) {
            var accounts = this.selectedAccounts();

            if (accounts.length > 0) {
                this.wizardState.mobileBankApiAccountsToSync = accounts.map(
                    function (account) {
                        return {
                            externalAccountId: account.externalAccountId,
                            accountName: account.name,
                            accountIsNew: account.accountIsNew,
                            mergeWithExisting: account.mergeWithExisting() === 'true' ? true : false,
                            existingAccountToMerge: account.existingAccountToMerge()
                        };
                    });

                this.wizard.addStep(MobileBankSyncStep);
                callback();
            } else {
                this.wizard.complete();
            }
        },

        onMergeCandidateChanged: function (bankAccount, event) {
            var me = topThis; // 'this' referrers to bankAccount here it can't be used

            if (bankAccount.existingAccountToMerge()) {
                bankAccount.existingAccountToMerge().selected(true);

                // we keep a mapping of selected candidates so we can set 'selected' to false later if the selected candidate changes
                me.bankAccountToCandidateMap[bankAccount.externalAccountId] = bankAccount.existingAccountToMerge().accountId;
            } else {
                if (me.bankAccountToCandidateMap[bankAccount.externalAccountId]) {
                    var previousCandidate = me.mergeCandidates().filter(
                        function(mc) {
                            return mc.accountId === me.bankAccountToCandidateMap[bankAccount.externalAccountId];
                        }
                    )[0];

                    if (previousCandidate)
                        previousCandidate.selected(false);

                    me.bankAccountToCandidateMap[bankAccount.externalAccountId] = null;
                }
            }
        },

        onAccountMergeOptionChanged: function (bankAccount, event) {
            // If option is changed from 'merge' to 'new account' we remove the selected merge candidate
            // so it frees up to be selected for another account
            if (bankAccount.mergeWithExisting() === 'false' && bankAccount.existingAccountToMerge()) {
                bankAccount.existingAccountToMerge().selected(false);
                bankAccount.existingAccountToMerge(null);
            }
        },

        onAccountSelected: function (bankAccount, event) {
            // If a whole account is deselected we remove the selected merge candidate
            // so it frees up to be selected for another account
            if (!bankAccount.selected() && bankAccount.existingAccountToMerge()) {
                bankAccount.existingAccountToMerge().selected(false);
                bankAccount.existingAccountToMerge(null);
            }
        },

        setOptionAsDisabled: function (option, item) {
            // if the merge candidate is selected we mark it as disabled in the 'select' list
            ko.applyBindingsToNode(option, { disable: item && item.selected }, item);
        },
    });
});
