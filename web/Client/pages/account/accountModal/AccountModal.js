define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountModal');
    var accountService = require('services/accountService');
    var config = require('config');
    var session = require('session');
    var AccountBalanceChart = require('./accountBalanceChart/AccountBalanceChart');
    var AccountPostings = require('./accountPostings/AccountPostings');
    var AccountTypeTooltip = require('components/accountTypeTooltip/AccountTypeTooltip');


        var ko = core.ko;

        return core.Popup.extend({
            template: template,

            constructor: function(accountGroupDto) {
                var me = this;

                _.extend(this, accountGroupDto);
                this.originalAccountType = accountGroupDto.accountType;
                this.accountGroupId = accountGroupDto.id;
                this.isAutomatic = accountGroupDto.isAutomatic;
                this.partnerId = accountGroupDto.partnerId;
                this.processing = ko.processingObservable();
                this.showCloseLink = ko.computed(function() {
                    return !this.processing();
                }, this);

                this.name = ko.observable(accountGroupDto.name);

                this.accountType = ko.observable(accountGroupDto.accountType);
                this.accountSubcategoryId = ko.observable(accountGroupDto.accountSubcategoryId);
                this.inActive = ko.observable(accountGroupDto.inActive);
                this.inActiveBySystem = accountGroupDto.inActiveBySystem;
                this.canDeleteAccount = accountGroupDto.ownerUserId === session.userId && accountGroupDto.connectionType !== 'Unlicensed';

                this.openBankingHubUrl = config.openBankingHubUrl;
                this.showHubDisclaimer = ko.computed(function() {
                    return me.inActive() && accountGroupDto.connectionType === 'Unlicensed';
                });

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

                this.tabIndex = ko.observable();

                this.currentTab = ko.observable();

                this.tabIndex.subscribe(function() {
                    if (this.currentTab())
                        this.currentTab().dispose();

                    if (this.tabIndex() === 0)
                        this.currentTab(new AccountBalanceChart(accountGroupDto));
                    if (this.tabIndex() === 1)
                        this.currentTab(new AccountPostings(accountGroupDto));
                }, this);

                this.tabIndex(0);

                this.editingBank = ko.observable(false);
                this.banks = this.registerDisposable(accountService.getBankDataSource({ owner: this }));
                this.banks.load();

                this.bankComboboxSource = ko.computed(function() {
                    return this.banks().map(function(b) {
                        return {
                            label: b.name,
                            value: b.id,
                            selectable: true
                        };
                    });
                }, this);

                this.bankId = ko.observable(accountGroupDto.bankId);
                this.bankName = ko.computed(function() {
                    var bankId = this.bankId();
                    var bank = this.banks().find(function(b) { return b.id === bankId; });
                    return bank ? bank.name : 'Ukendt bank';
                }, this);

                this.accountTypeTooltip = this.registerDisposable(new AccountTypeTooltip());

                this.accountTypeFormatted = ko.computed(function() {
                    return accountService.formatAccountType(this.accountType(), this.accountSubcategoryId());
                }, this);

                this.base({ disposeOnClose: true });
            },

            saveAndClose: function() {
                var me = this;

                var changingToNonConsumption = this.accountType() !== 'Consumption' && this.accountType() !== this.originalAccountType;
                if (changingToNonConsumption && !confirm('Låne- og opsparingskonti skjules fra Spiir. Kategorisering, splits og tags bliver fjernet.\n\nEr du sikker du vil skifte typen?'))
                    return;

                if (!this.name()) {
                    alert('Venligst indtast et navn.');
                    return;
                }

                this.processing.start();
                accountService.updateAccountGroup(this.accountGroupId, this.name(), this.accountType(), this.accountSubcategoryId(), this.bankId())
                    .then(this.processing.stop)
                    .then(function() {
                        me.close();
                    })
                    .fail(this.processing.stop);
            },

            closeAccountGroup: function () {
                var me = this;

                this.processing.start();

                accountService.closeAccountGroup(this.accountGroupId)
                    .then(this.processing.stop)
                    .then(this.inActive(true))
                    .fail(function() {
                        me.processing.stop();
                        me.inActive(false);
                    });
            },

            reopenAccountGroup: function () {
                var me = this;

                this.processing.start();
                accountService.reopenAccountGroup(this.accountGroupId)
                    .then(this.processing.stop)
                    .then(function () {
                        me.inActive(false);
                        me.close();
                    })
                    .fail(function () {
                        me.processing.stop();
                        me.inActive(true);
                    });
            },

            deleteAccountGroup: function() {
                var me = this;

                if (!confirm('Er du sikker på at du vil slette kontoen "' + this.name() + '" og alle de poster som er på kontoen?'))
                    return;

                this.processing.start();
                accountService.deleteAccountGroup(this.accountGroupId)
                    .then(this.processing.stop)
                    .then(function() {
                        me.close();
                    })
                    .fail(this.processing.stop);
            },

            dispose: function() {
                this.banks.dispose();
                this.base();
            },

            editBank: function() {
                this.editingBank(true);
            },

            goToPostings: function() {
                location.assign(config.urls.postings + '?' + $.param({ accountGroupIds: this.accountGroupId }));
            },

            onAccountTypeFocus: function (data, event) {
                this.accountTypeTooltip.show(event.target);
            },

            onAccountTypeBlur: function () {
                this.accountTypeTooltip.hideAfterTimeout(100);
            }
        });
    });
