define(function(require) {
    var Base = require('lib/Base');
    var EventHandlerMixin = require('./EventHandlerMixin');
    var hub = require('./hub');


    var Component = Base.extend({
        dispose: function() {
            this.disposeEventHandlers();

            if (this._disposableObjects) {
                this._disposableObjects.forEach(function(o) {
                    if (o.dispose)
                        o.dispose();
                });
            }
        },

        subscribeToHubMessage: function(messageName, handler) {
            this.registerDisposable({
                dispose: function() { hub.off(messageName, handler); }
            });
            hub.on(messageName, handler);
        },

        registerDisposable: function(disposableObject) {
            if (!this._disposableObjects)
                this._disposableObjects = [];
            this._disposableObjects.push(disposableObject);
            return disposableObject;
        }
    });

    _.extend(Component.prototype, EventHandlerMixin);
    return Component;
});