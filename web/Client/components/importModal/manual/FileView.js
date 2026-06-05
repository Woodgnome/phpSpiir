define(function(require) {
    var core = require('framework/core');
    var template = require('template!FileView');
    var NewAccountConfiguration = require('../shared/NewAccountConfiguration');



        var states = {
            uploading: 'uploading',
            failed: 'failed',
            success: 'success'
        };

        return core.Component.extend({
            template: template,

            constructor: function(file, hasExistingManualAccounts) {
                this.fileId = file.id;
                this.fileName = file.name;

                this.errorMessage = ko.observable(null);
                this.state = ko.observable(states.uploading);
                this.drawerVisible = ko.observable(false);

                ko.computed(function() {
                    this.drawerVisible();
                    this.trigger('resize');
                }, this).extend({ throttle: 300 });

                this.statusMessage = ko.computed(function() {
                    switch (this.state()) {
                    case states.uploading:
                        return 'Indlæser...';
                    case states.failed:
                        return 'Fil ikke indlæst';
                    }
                }, this);

                this.account = null;
                this.accountId = null;
                this.accountIsNew = ko.observable(false);
                this.accountName = ko.observable('');
                this.newPostingCount = ko.observable(0);
                this.configuration = ko.observable();
                this.incorrectOverlapsFixed = ko.observable(false);
                this.accountsMerged = ko.observable(false);
                this.uploadResultMessage = ko.observable(false);

                this.isConfigured = ko.observable(true);
                this.highlight = ko.computed(function() {
                    return this.state() === states.success && !this.isConfigured();
                }, this);

                this.clickable = ko.computed(function() {
                    var state = this.state(),
                        accountIsNew = this.accountIsNew();

                    if (state === states.uploading)
                        return false;

                    if (state === states.success && !accountIsNew)
                        return false;

                    return true;
                }, this);

                this.iconClass = ko.computed(function() {
                    var state = this.state(),
                        highlight = this.highlight();

                    if (highlight)
                        return '';

                    return state;
                }, this);

                this.showOverlapInfo = ko.computed(function() {
                    var state = this.state(),
                        accountIsNew = this.accountIsNew();
                    return state === 'success' && accountIsNew && hasExistingManualAccounts;
                }, this);
            },

            markUploaded: function(file, uploadResult) {
                if (uploadResult.success) {
                    var accountSelectionResult = uploadResult.accountSelectionResult;
                    var account = accountSelectionResult.account;

                    this.state(states.success);
                    this.account = account;
                    this.accountId = account.rowKey;
                    this.accountIsNew(accountSelectionResult.accountIsNew);
                    this.accountName(account.name);
                    this.newPostingCount(uploadResult.newPostings);
                    this.uploadResultMessage(uploadResult.message);
                    if (this.accountIsNew()) {
                        this.isConfigured(false);

                        this.configuration(this.registerDisposable(new NewAccountConfiguration(account.rowKey, account.accountGroupId)));
                        var drawerHiddenAutomatically = false;
                        this.configuration().on('isValidChanged', function (isValid) {
                            if (isValid && !drawerHiddenAutomatically) {
                                this.drawerVisible(false);
                                drawerHiddenAutomatically = true;
                            }
                            this.isConfigured(isValid);
                        }, this);

                        this.drawerVisible(true);
                    }
                    
                    if (accountSelectionResult.incorrectOverlapsFixed) {
                        this.incorrectOverlapsFixed(true);
                        this.drawerVisible(true);
                    }

                    if (accountSelectionResult.accountsMerged) {
                        this.accountsMerged(true);
                        this.drawerVisible(true);
                    }
                } else {
                    this.drawerVisible(true);
                    this.state(states.failed);
                    this.errorMessage(uploadResult.message);
                }
            },

            markFailed: function(file, error) {
                this.drawerVisible(true);
                this.state(states.failed);
                this.errorMessage(error.message);
            },

            getSaveAction: function() {
                if (!this.accountIsNew())
                    return null;

                var action = this.configuration().getAction();
                action.name = this.accountName();
                return action;
            },

            click: function (data, event) {
                var me = this;
                if ($(event.target).is('input')) // prevent clicks on the input from toggling the drawer
                    return;

                if (!this.clickable())
                    return;

                this.drawerVisible(!this.drawerVisible());
            }
        });
    });