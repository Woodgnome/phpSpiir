define(function(require) {
    var Component = require('./Component');
    var ko = require('lib/knockout');


    return Component.extend({
        title: document.title,

        app: null, // set by Application,

        titlePrefix: 'Spiir > ',

        routes: [{ url: '', action: 'index' }],

        constructor: function() {
            if (this.title && this.title.subscribe) {
                this.title.subscribe(function(newTitle) {
                    document.title = this.titlePrefix + newTitle;
                }, this);
            }
            document.title = this.titlePrefix + ko.utils.unwrapObservable(this.title);
            this.currentSubNavigationItem = ko.observable(this.subNavigation.defaultItem);
        },

        index: function() {

        },

        navigate: function(routeId, routeParameters, options) {
            this.app.navigate(routeId, routeParameters, options);
        },

        subNavigation: { defaultItem: null, items: [] },

        subNavigate: function(itemId) {
            this.currentSubNavigationItem(itemId);
        }
    });
});