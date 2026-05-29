define(function(require) {
    var ko = require('lib/knockout');
    var Component = require('./Component');
    var Router = require('./Router');
    var config = require('config');
    var Page = require('./Page');
    var hub = require('./hub');


    var trimUrlRegex = /^\/|\/$/g ;

    var DefaultNotFoundPage = Page.extend({
        title: 'Not found',
        template: '<div class="content"><div class="main"><h1>Vi kunne desværre ikke finde siden!</h1></div></div>'
    });

    var Application = Component.extend({
        template: '<div data-bind="component: currentPage"></div>',

        constructor: function() {
            var me = this;
            if (Application.instance)
                throw 'Application: There can only be a single instance of Application';

            Application.instance = this;

            this.router = new Router(config.clientBaseUrl);
            this.router.on('404', function() {
                me.goToPage(me.notFoundPage, 'index', []);
            });

            if (config.serverPages) {
                _.each(config.serverPages, function(url, id) {
                    me.router.addRoute('server:' + id.capitalize(), url, 'server');
                });
            }

            // Remove when all pages have been converted to SPA:
            if (config.spaUrlLegacyOverrides && $('html').is('.legacyPage')) {
                _.each(config.spaUrlLegacyOverrides, function(url, routeId) {
                    me.router.addRoute(routeId, url, 'server');
                });
            }

            this.currentPage = ko.observable(null);
            this.notFoundPage = DefaultNotFoundPage;
        },

        error: function(code, data) {
            this.trigger('error', data);
            console.log('Application.error:', code, data);
        },

        launch: function(options) {
            options = _.extend({
                container: 'body',
                pushState: true
            }, options);

            this.container = options.container;

            this.router.start({ pushState: options.pushState });
        },

        initializeContainer: function() {
            var me = this;

            $(function() {
                if (me.initializedContainer)
                    return;

                me.initializedContainer = true;

                var container = $(me.container);
                container.html(_.isString(me.template) ? me.template : me.template.content);
                container.show();
                ko.applyBindings(me, container.get(0));
            });
        },

        goToPage: function(pageClass, action, actionArguments) {
            this.initializeContainer();

            var pageInstance = this.currentPage();

            if (!(pageInstance instanceof pageClass)) {
                if (pageInstance)
                    pageInstance.dispose();

                pageInstance = new pageClass();
                pageInstance.app = this;
                this.currentPage(pageInstance);
            }

            if (_.isString(action)) {
                if (!pageInstance[action])
                    throw 'Application.goToPage: Unknown page action ' + action;

                action = pageInstance[action];
            }

            if (!_.isFunction(action))
                throw 'Application.goToPage: Action is not a function';

            this.trigger('beforePageChange');
            hub.post('app:beforePageChange');

            var t = new Date();
            var returnValue = action.apply(pageInstance, actionArguments);

            if (returnValue && typeof returnValue.then === 'function') {
                $('#loader').show();
                returnValue.then(function() {
                    console.log('Page done loading', (new Date().getTime() - t.getTime()));
                    $('#loader').fadeOut(100);
                });
            }

            this.trigger('pageChanged');
            hub.post('app:pageChanged');
        },

        navigate: function(routeId, routeParameters, options) {
            options = options || { };
            this.router.navigate(routeId, routeParameters, options.trigger, options.replace);
        },

        registerPage: function(baseUrl, pageClass) {
            var me = this;

            var pageRoutes = pageClass.prototype.routes || pageClass.routes;

            pageRoutes.forEach(function(pageRoute) {
                var fullUrl = (baseUrl + '/' + pageRoute.url).replace(trimUrlRegex, '');

                me.router.addRoute(pageRoute.id, fullUrl, function() {
                    me.goToPage(pageClass, pageRoute.action, arguments);
                }, pageRoute.enums);
            });
        },
                
        getCurrentUrl: function() {
            return config.clientBaseUrl + this.router.getCurrentUrl();
        }
    });

    return Application;
});