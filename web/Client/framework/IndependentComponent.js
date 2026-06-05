define(function(require) {
    var Component = require('./Component');
    var ko = require('lib/knockout');


    return Component.extend({
        addToDom: function(options) {
            this.createElement();
            this.applyBindings();

            if (options && options.hidden)
                this.element.hide();
        },

        applyBindings: function() {
            ko.applyBindings(this, this.element.get(0));
        },

        createElement: function(container) {
            if (!this.template)
                throw new Error('IndependentComponent.createElement: Template is missing');

            var template = _.isString(this.template) ? this.template : this.template.content;
            this.element = $(template).appendTo(container || 'body');
        },

        dispose: function() {
            if (this.isDisposed)
                return;

            if (!this.element) 
                return;
            
            ko.cleanNode(this.element[0]);

            this.isDisposed = true;

            this.element.hide().remove();
            this.element = null;

            this.base();
        }
    });
});