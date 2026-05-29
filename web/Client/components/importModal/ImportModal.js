define(function (require) {
    var core = require('framework/core');
    var template = require('template!ImportModal');
    var Wizard = require('components/wizard/Wizard');
    var AddBankStep = require('./shared/AddBankStep');
    var FileStep = require('./manual/FileStep');
    var MobileBankAccountStep = require('./automatic/MobileBankAccountStep');
    var MobileBankSyncStep = require('./automatic/MobileBankSyncStep');
    var ImportCompleteStep = require('./shared/ImportCompleteStep');
    var MobileBankUpdateStep = require('./automatic/MobileBankUpdateStep');
    var AutomaticUpdateStep = require('./automatic/AutomaticUpdateStep');
    var TokenExchangeStep = require('./automatic/TokenExchangeStep');
    var ExternalAuthProviderStep = require('./automatic/ExternalAuthProviderStep');
    var PartnerInfoStep = require('./shared/PartnerInfoStep');
    var MobileAppRequiredStep = require('./shared/MobileAppRequiredStep');
    var MobileBankApiService = require('services/mobileBankApiService');
    var ConsentService = require('services/consentService');

    // All possible processions of steps need to be defined here, as the wizard generally doesn't know which steps comes next
    // (each steps chooses its own next step, which differs from most wizards that define the steps up front).
    var bulletDefinitions = [
        // NAG
        [AddBankStep, ExternalAuthProviderStep, MobileBankAccountStep, MobileBankSyncStep, ImportCompleteStep],
        [AddBankStep, TokenExchangeStep, MobileBankAccountStep, MobileBankSyncStep, ImportCompleteStep],
        // Add manual bank
        [AddBankStep, FileStep, ImportCompleteStep],
        // Lån & Spar bank
        [AddBankStep, PartnerInfoStep],
        // Add account to existing login
        [ExternalAuthProviderStep, MobileBankAccountStep, MobileBankSyncStep, ImportCompleteStep],
        [TokenExchangeStep, MobileBankAccountStep, MobileBankSyncStep, ImportCompleteStep],
        // Update using CSV
        [FileStep, ImportCompleteStep],
        // Add automatic bank using CSV
        [AddBankStep, ExternalAuthProviderStep, FileStep, ImportCompleteStep],
        // Update automatic accounts
        [AutomaticUpdateStep, MobileBankSyncStep, ImportCompleteStep],
        // Update automatic accounts, login failed
        [ExternalAuthProviderStep, AutomaticUpdateStep, MobileBankSyncStep, ImportCompleteStep],
        [TokenExchangeStep, AutomaticUpdateStep, MobileBankSyncStep, ImportCompleteStep],
        // Aiia Data
        [MobileAppRequiredStep],
    ];

    var bulletUtils = {
        arrayItemsMatchClasses: function (array, classes) {
            for (var i = 0, l = array.length; i < l; i++) {
                if (!(array[i] instanceof classes[i]))
                    return false;
            }
            return true;
        },

        findBulletDefinition: function (steps) {
            for (var i = 0, l = bulletDefinitions.length; i < l; i++) {
                if (this.arrayItemsMatchClasses(steps, bulletDefinitions[i]))
                    return bulletDefinitions[i];
            }

            return [];
        },

        removeDuplicatesBasedOnText: function (bullets) {
            if (bullets.length === 0) return [];

            var result = [bullets[0]];
            for (var i = 1, l = bullets.length; i < l; i++) {
                if (bullets[i].text === result[result.length - 1].text) {
                    result[result.length - 1].done = bullets[i].done;
                    if (bullets[i].current)
                        result[result.length - 1].current = true;
                } else {
                    result.push(bullets[i]);
                }
            }

            return result;
        },

        getStepTitle: function (cls) {
            switch (cls) {
                case AddBankStep:
                    return 'Vælg bank';
                case ExternalAuthProviderStep:
                case TokenExchangeStep:
                    return 'Log på';
                case MobileBankAccountStep:
                case MobileBankSyncStep:
                    return 'Vælg konti';
                case AutomaticUpdateStep:
                case MobileBankUpdateStep:
                    return 'Opdaterer';
                case ImportCompleteStep:
                    return 'Færdig';
                case PartnerInfoStep:
                    return 'Lån & Spar';
                case MobileAppRequiredStep:
                    return 'App required';
                case FileStep:
                    return 'Indlæs poster';
            }
            return 'UNKNOWN';
        }
    };

    var modalClass = core.Popup.extend({
        template: template,

        constructor: function (firstStep, initialState) {
            var me = this;

            var closeDisabled = ko.observable(false);
            initialState = _.extend({ closeDisabled: closeDisabled }, initialState);

            this.wizard = new Wizard([firstStep], initialState, { completeLabel: 'Videre', canGoBack: true, removeStepOnBack: true });
            this.bullets = ko.computed(this.calculateBullets, this);

            this.wizard.complete = function () {
                me.close();
            };

            this.wizard.showPager(false);

            this.wizard.processing.setBeforeUnloadMessage('Spiir er i gang med en operation. Vi anbefaler dig at forblive på siden indtil den er færdig.');

            // Custom showCloseLink implementation. Important to have this before the call to the base class.
            this.showCloseLink = ko.computed(function () {
                return !this.wizard.processing() && !closeDisabled();
            }, this);

            this.base({ disposeOnClose: true, closeOnBackgroundClick: false, closeOnEscape: false });
        },

        close: function () {
            var me = this;

            if (!me.wizard.wizardState.logoffCalled) {
                MobileBankApiService.logOff();
            }

            me._close();
        },

        dispose: function () {
            this.wizard.dispose();
            this.base();
        },

        calculateBullets: function () {
            var currentIndex = this.wizard.currentIndex();

            var def = bulletUtils.findBulletDefinition(this.wizard.steps());

            return bulletUtils.removeDuplicatesBasedOnText(def.map(function (cls, index) {
                return {
                    text: bulletUtils.getStepTitle(cls),
                    done: index < currentIndex,
                    current: currentIndex === index
                };
            }));
        }
    });

    modalClass.showMobileAppRequiredModal = function () {
        new modalClass(MobileAppRequiredStep).open();
    };

    modalClass.showAddBankModal = function () {
        ConsentService.getConsent({consentId: 'automatic-sync'}).then(function(granted) {
            if (granted) {
                new modalClass(AddBankStep).open();
            }
        });
    };

    modalClass.showManualImportModal = function (bank) {
        new modalClass(FileStep, { bank: bank }).open();
    };

    modalClass.updateAutomaticBank = function (bank, bankCredentialsId, supportsUnattended) {
        new modalClass(AutomaticUpdateStep, { bank: bank, bankCredentialsId: bankCredentialsId, onlyAlreadyConnectedAccounts: true, supportsUnattended: supportsUnattended }).open();
    };

    modalClass.loginToAutomaticBank = function (bank, onlyAlreadyConnectedAccounts) {
        if (bank.id === 'LaanSparBank') {
            new modalClass(PartnerInfoStep, { bank: bank, onlyAlreadyConnectedAccounts: onlyAlreadyConnectedAccounts }).open();
            return;
        }

        var stepAfterLogin;

        if (onlyAlreadyConnectedAccounts) {
            stepAfterLogin = AutomaticUpdateStep;
        } else {
            stepAfterLogin = MobileBankAccountStep;
        }

        new modalClass(ExternalAuthProviderStep, { bank: bank, stepAfterLogin: stepAfterLogin, onlyAlreadyConnectedAccounts: onlyAlreadyConnectedAccounts }).open();
    };

    modalClass.addAccounts = function (bank, bankCredentialsId, supportsUnattended) {
        new modalClass(AutomaticUpdateStep, {
            bank: bank,
            bankCredentialsId: bankCredentialsId,
            onlyAlreadyConnectedAccounts: false,
            syncOnlyNewAccounts: true,
            supportsUnattended: supportsUnattended
        }).open();
    };

    modalClass.showTokenExchangeModal = function (options) {
        new modalClass(TokenExchangeStep, {
            token: options['code'],
            error: options['error'],
            bankId: options['bankId'],
            onlyAlreadyConnectedAccounts: options['connectedAccounts'] === '1' ? true : false,
            syncOnlyNewAccounts: options['newAccounts'] === '1' ? true : false
        }).open();
    };

    return modalClass;
});
