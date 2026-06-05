define(function(require) {
    var core = require('framework/core');
    var template = require('template!SpiirApplication');
    var networkService = require('services/networkService');
    var authenticationService = require('services/authenticationService');
    var joyRideService = require('services/joyRideService');
    var Navigation = require('components/Navigation');
    var TopPanel = require('components/TopPanel');
    var BudgetPage = require('pages/budgets/BudgetPage');
    var OverviewPage = require('pages/overview/OverviewPage');
    var ExpenseCategoryPage = require('pages/overview/ExpenseCategoryPage');
    var IncomeCategoryPage = require('pages/overview/IncomeCategoryPage');
    var SavingCategoryPage = require('pages/overview/SavingCategoryPage');
    var AccountPage = require('pages/account/AccountPage');
    var session = require('session');
    var ErrorNotification = require('components/errorNotification/ErrorNotification');
    var PeriodPage = require('pages/account/PeriodPage');
    var DocumentPage = require('pages/documents/DocumentPage');
    var AutoSyncJoyRide = require('components/AutoSyncJoyRide');
    var UserMessageModal = require('components/userMessageModal/UserMessageModal');
    var NewTermsModal = require('components/newTermsModal/NewTermsModal');
    var EmailVerificationModal = require('components/emailVerificationModal/emailVerificationModal');
    var ImportModal = require('components/importModal/ImportModal');
    var utilities = require('utilities/utilities');

    //core.enableProfiling();
    var ko = core.ko;

    return core.Application.extend({
        template: template,

        constructor: function() {
            this.base();

            this.topPanel = new TopPanel();
            this.navigation = new Navigation();
            this.notifications = ko.observableArray();
            _.bindAll(this, 'removeNotification');
        },

        launch: function() {
            var me = this;

            this.setupErrorHandling();
            this.setupContentHeightFix();
            this.setupStartupTasks();
            this.showServerNotifications();
            authenticationService.setupLoggedOnCheck();

            this.registerPage('budgetter', BudgetPage);
            this.registerPage('udgifter', ExpenseCategoryPage);
            this.registerPage('indkomst', IncomeCategoryPage);
            this.registerPage('opsparing', SavingCategoryPage);
            this.registerPage('bilag2', DocumentPage);
            this.registerPage('konti', AccountPage);
            this.registerPage('konti/perioder', PeriodPage);
            this.registerPage('', OverviewPage);

            this.base({ container: '.page' });

            // Clear modal tasks before page change. Important to register the event handler after calling base.launch, as that triggers
            // beforePageChanged, and we must not remove the initial modal tasks.
            this.on('beforePageChange', function() {
                me.modalTaskQueue = [];
                me.modalTaskQueueRunning = false;
            });
        },

        setupStartupTasks: function() {
            var me = this;

            var justLoggedIn = false;
            if ($.cookie('ShowLoginNotification') === 'true') {
                justLoggedIn = true;
                $.cookie('ShowLoginNotification', null, { path: '/' });
            }

            // when user is redirected from NAG app back to Spiir
            if (/connected-bank/.test(window.location.href)) {
                var queryParams = utilities.parseQueryString(window.location.search);

                if (queryParams['code'] || queryParams['error']) {
                    ImportModal.showTokenExchangeModal(queryParams);

                    // remove query params from URL
                    var urlWithoutQueryParams = window.location.href.replace(window.location.search, '');
                    window.history.replaceState({}, document.title, urlWithoutQueryParams);
                }

            } else if (!session.user.emailVerified && session.user.emailVerificationRequired) {
                this.addModalTask(function (callback) {
                    var modal = new EmailVerificationModal();
                    modal.bind('close', callback);
                    modal.open();
                });
            } else if (session.newTerms) {
                this.addModalTask(function (callback) {
                    var modal = new NewTermsModal(session.newTerms);
                    modal.bind('close', callback);
                    modal.open();
                });
            } else if (/showAutoSyncUpsell/.test(location.href)) {
                this.addModalTask(function(callback) {
                    new AutoSyncJoyRide(callback).begin();
                });
            } else if (justLoggedIn || /testLoginTasks/.test(location.href)) {
                // Prevent login tasks when coming from "Disable auto sync" link in the "BankData auto sync re-enabled" mail,
                // and in particular, prevent updating on login.
                if (location.href.indexOf('utm_content=LinkToDisableAutoSync') >= 0)
                    return;

                if (session.userMessages.length > 0) {
                    new UserMessageModal(session.userMessages).open();
                    return;
                }

                // Show NotificationTooltip only if user has seen welcome joyride
                if (!joyRideService.hasUserSeenJoyRide('WelcomeToSpiirJoyRide'))
                    return;

                // TODO is this still doing anything?
                me.addModalTask(function(callback) {
                    callback();
                });
            }
        },

        runModalTaskQueue: function() {
            var me = this;

            if (this.modalTaskQueueRunning)
                return;

            this.modalTaskQueueRunning = true;

            var processQueue = function() {
                if (me.modalTaskQueue.length === 0) {
                    me.modalTaskQueueRunning = false;
                    return;
                }

                var nextTask = me.modalTaskQueue.shift();

                nextTask(processQueue);
            };

            $(processQueue);
        },

        addModalTask: function(task) {
            if (!this.modalTaskQueue)
                this.modalTaskQueue = [];

            this.modalTaskQueue.push(task);

            this.runModalTaskQueue();
        },

        setupErrorHandling: function() {
            var me = this;

            networkService.on('error', this.handleNetworkError.bind(this));

            $(window).on('beforeunload', function() {
                me.preventErrorMessages = true;
            });

            var pageChanges = 0;
            this.on('pageChanged', function() {
                if (pageChanges++ === 0)
                    return;

                me.notifications.removeAll();
            });

            $(document).on('modalpopup:open modalpopup:close', function() {
                me.notifications.removeAll();
            });
        },

        handleNetworkError: function(event, error) {
            error.acknowledge();

            if (this.preventErrorMessages)
                return;

            this.addNotification(new ErrorNotification(error), 'error');
        },

        setupContentHeightFix: function() {
            var fixContentHeight = function() {
                var windowHeight = $(window).height();
                $('.page').css('min-height', windowHeight);
                var content = $('.page > .content, .page > :not(.topPanel) .content');
                content.css('min-height', windowHeight - parseInt(content.css('padding-top'), 10));
            };
            $(window).bind('resize', fixContentHeight);

            this.on('pageChanged', function() {
                // Aggressive re-calculation - a defer is sometimes needed
                fixContentHeight();
                _.defer(function() {
                    fixContentHeight();
                });
            });
        },

        addNotification: function(notification, type) {
            var me = this;

            if (_.isString(notification))
                notification = { template: { content: '<p>' + notification + '</p>' }, notificationType: type || 'info' };
            else
                notification.notificationType = type;

            this.notifications.push(notification);

            if (type !== 'error') {
                setTimeout(function() {
                    me.removeNotification(notification);
                }, 15000);
            }
        },

        removeNotification: function(notification) {
            this.notifications.remove(notification);
        },

        notificationBeforeRemove: function(element) {
            // Knockout unfortunately calls this function for text nodes as well - and slideUp doesn't work for them
            if (element.nodeType === 1) {
                $(element).slideUp('fast', function() {
                    $(element).remove();
                });
            } else {
                $(element).remove();
            }
        },

        showServerNotifications: function() {
            var me = this;
            session.serverNotifications.forEach(function(notification) {
                me.addNotification(notification.message, notification.notificationType === 1 ? 'error' : 'info');
            });
        }
    });
});
