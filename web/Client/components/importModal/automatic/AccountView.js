define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountView');
    var utilities = require('utilities/utilities');
    var accountService = require('services/accountService');
    var config = require('config');
    var NewAccountConfiguration = require('../shared/NewAccountConfiguration');


    var states = {
        pending: '',
        uploading: 'uploading',
        failed: 'failed',
        success: 'success'
    };

    var AccountView = core.Component.extend({
        template: template,

        constructor: function(options) {
	        if (!options.accountName || typeof (options.accountIsNew) === 'undefined')
                throw new Error('Invalid parameters given to AccountView.');

            this.externalAccountId = options.externalAccountId;

            this.state = ko.observable(states.pending);
            this.drawerVisible = ko.observable(false);

            this.account = null;
            this.accountIsNew = ko.observable(options.accountIsNew);
            this.accountsMerged = ko.observable(false);
            this.accountName = ko.observable(options.accountName);
            this.newPostingCount = ko.observable(0);

            this.configuration = ko.observable();

            this.isConfigured = ko.observable(options.isConfigured);
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
        },

        markUpdating: function() {
            this.state(states.uploading);
        },

        markFailed: function() {
            this.state(states.failed);
        },

        markComplete: function(syncResult) {
            this.accountId = syncResult.accountId;
            this.accountGroupId = syncResult.accountGroupId;
            this.state(states.success);
            this.newPostingCount(syncResult.newPostings);
            this.accountsMerged(syncResult.accountsMerged);
            this.accountIsNew(syncResult.accountIsNew);

            if (syncResult.accountIsNew === true && syncResult.accountsMerged === false) {
                this.isConfigured(false);

                this.configuration(this.registerDisposable(new NewAccountConfiguration(syncResult.accountId, syncResult.accountGroupId)));
                var drawerHiddenAutomatically = false;
                this.configuration().on('isValidChanged', function(isValid) {
                    if (isValid && !drawerHiddenAutomatically) {
                        this.drawerVisible(false);
                        drawerHiddenAutomatically = true;
                    }
                    this.isConfigured(isValid);
                }, this);

                this.drawerVisible(true);
            } else {
                this.isConfigured(true);
            }
        },

        getSaveAction: function() {
            if (!this.accountIsNew() || this.isConfigured() || this.accountsMerged() || this.state() === states.failed)
                return null;

            return this.configuration().getAction();
        },

        click: function() {
            if (!this.clickable())
                return;

            this.drawerVisible(!this.drawerVisible());
        }
    });

    AccountView.states = states;
    return AccountView;
});