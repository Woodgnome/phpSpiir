define(function(require) {
    var core = require('framework/core');
    var template = require('template!SubNavigation');


    var ko = core.ko;
    
    return core.Base.extend({
        template: template,

        constructor: function(oldSubNavigation) {
            _.bindAll(this, 'clickSubNavigation');
            
            this.currentPage = ko.computed(function() {
                if (!core.Application.instance)
                    return null;
                return core.Application.instance.currentPage();
            });

            this.subNavigation = ko.computed(function() {
                var items;

                if (oldSubNavigation) {
                    oldSubNavigation.forEach(function(item) { item.id = item.url; });
                    items = oldSubNavigation;
                } else {
                    var currentPage = this.currentPage();
                    if (!currentPage) return [];
                    items = currentPage.subNavigation.items;
                    items.forEach(function(item) {
                        if (item.routeId) {
                            item.id = item.routeId;
                            item.url = core.Application.instance.router.resolveAbsoluteUrl(item.routeId);
                        }
                    });
                }

                if (items.length > 1)
                    return items;

                return [];
            }, this);

            this.currentSubNavigationItem = ko.computed(function() {
                if (oldSubNavigation) {
                    var selectedItem = oldSubNavigation.find(function(item) { return item.selected; });
                    return selectedItem ? selectedItem.id : null;
                } else {
                    var currentPage = this.currentPage();
                    if (!currentPage) return null;
                    return currentPage.currentSubNavigationItem();
                }
            }, this);
        },

        clickSubNavigation: function (item) {
            var app = core.Application.instance;
            if (item.routeId) {
                var route = app.router.getRouteById(item.routeId);
                if (route.handler === 'server' && item.url)
                    return true;

                app.navigate(item.routeId, { }, { trigger: true });
                return false;
            }

            if (item.url)
                return true;

            var currentPage = this.currentPage();
            currentPage.subNavigate(item.id);
        }
    });
});