define(function(require) {
    var core = require('framework/core');
    var template = require('template!EditPeriodPopover');
    var accountService = require('services/accountService');
    var postingService = require('services/postingService');
    var TooltipBase = require('components/TooltipBase');


        return TooltipBase.extend({
            template: template,

            constructor: function(period, accountPeriods, processing) {
                var me = this;

                this.accountId = period.accountId;
                this.processing = processing;

                this.postingCount = period.postingCount;
                this.ignoredPostingCount = period.ignoredPostingCount;

                this.otherAccountGroups = ko.observableArray();
                this.selectedAccountGroup = ko.observable();

                this.canMove = ko.computed(function() {
                    return this.otherAccountGroups().length > 0;
                }, this);

                this.canMoveToNewAccount = ko.computed(function() {
                    return accountPeriods.periods.length > 1;
                }, this);
                this.canDelete = this.canMoveToNewAccount;

                this.newAccountGroupName = ko.observable();

                this.startDate = period.startDate;
                this.endDate = period.endDate;
                this.ignorePostingsBefore = period.ignorePostingsBefore;
                this.ignorePostingsAfter = period.ignorePostingsAfter;

                this.moveFormVisible = ko.observable(false);

                this.loadingPostings = ko.observable(true);
                this.postings = ko.observableArray();

                this.base({ position: 'right', disableMouseEvents: true });

                accountService.getAccountGroupsThatPeriodCanBeMovedTo(period).then(this.otherAccountGroups);

                postingService.getPostings({ accountIds: [period.accountId], includeAccountGroupDuplicates: true, includeNonConsumption: true })
                    .then(function(result) {
                        me.loadingPostings(false);
                        me.postings(result.postings);
                    });
            },

            moveToAnotherAccount: function() {
                var me = this;

                if (!this.selectedAccountGroup())
                    return;

                var anyTargetPeriodOverlaps = this.selectedAccountGroup().periods.some(function(targetPeriod) {
                    if (targetPeriod.startDate <= me.startDate && me.startDate <= targetPeriod.endDate)
                        return true;

                    if (targetPeriod.startDate <= me.endDate && me.endDate <= targetPeriod.endDate)
                        return true;

                    return false;
                });

                if (anyTargetPeriodOverlaps && !confirm('Perioden, du vil flytte, overlapper med poster fra ' + this.selectedAccountGroup().name + '. Når de to perioder flettes sammen, så skjules dubletter. Tryk ’OK’ hvis du ønsker at fortsætte.'))
                    return;

                this.processing.start();

                accountService.moveAccountToGroup(this.accountId, this.selectedAccountGroup().id)
                    .then(this.processing.stop)
                    .then(function() { me.notifyOfChangesAndClose(); });
            },

            moveAccountToNewAccountGroup: function() {
                var me = this;

                if (!this.newAccountGroupName())
                    return;

                this.processing.start();

                accountService.moveAccountToNewAccountGroup(this.accountId, this.newAccountGroupName())
                    .then(this.processing.stop)
                    .then(function() { me.notifyOfChangesAndClose(); });
            },

            notifyOfChangesAndClose: function() {
                this.trigger('periodChanged');
                this.close();
            },

            close: function() {
                this.dispose();
            },

            deleteAccount: function() {
                var me = this;

                if (!confirm('Er du sikker på at du vil slette perioden og alle de poster som tilhører den?'))
                    return;

                this.processing.start();
                accountService.deleteAccount(this.accountId)
                    .then(this.processing.stop)
                    .then(function() { me.notifyOfChangesAndClose(); });
            },

            showMoveForm: function() {
                this.moveFormVisible(true);
            }
        });
    });