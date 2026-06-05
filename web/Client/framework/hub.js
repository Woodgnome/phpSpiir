define(function(require) {
    var EventHandlerMixin = require('./EventHandlerMixin');


    var hub = _.extend({}, EventHandlerMixin);
    hub.debug = false;

    hub.post = function(message) {
        if (hub.debug) {
            var subscribers = this.__eventHandlers && this.__eventHandlers[message] || [];
            var stacks = subscribers.map(function(fn) { return fn.__ehm_stack; });
            console.log('hub: Posting message "%s" to %i subscribers.', message, subscribers.length, stacks);
        }
        this.trigger.apply(this, arguments);
    };

    return hub;
});