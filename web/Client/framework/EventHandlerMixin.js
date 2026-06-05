define(function(require) {
    var ko = require('lib/knockout');

    return {
        on: function(eventName, handler, context) {
            if (!this.__eventHandlers) this.__eventHandlers = {};
            if (!this.__eventHandlers[eventName]) this.__eventHandlers[eventName] = [];
            if (context)
                handler = handler.bind(context);
            this.__eventHandlers[eventName].push(handler);
        },

        off: function(eventName, handler) {
            if (!this.__eventHandlers) return;

            if (!handler)
                this.__eventHandlers[eventName] = [];
            else
                ko.utils.arrayRemoveItem(this.__eventHandlers[eventName], handler);
        },

        trigger: function(eventName) {
            if (!this.__eventHandlers) return;
            var handlers = this.__eventHandlers[eventName];
            if (!handlers) return;
            var args = Array.prototype.slice.call(arguments, 1);
            var me = this;
            handlers.forEach(function(handler) {
                handler.apply(me, args);
            });
        },

        disposeEventHandlers: function() {
            this.__eventHandlers = null;
        }
    };
});
