define(function(require) {
    var core = require('framework/core');


    var ko = core.ko;

    return core.Component.extend({
        showActions: true,

        constructor: function(wizard, processing, wizardState) {
            this.visible = ko.observable(false);
            this.wizard = wizard; // instance of Wizard
            this.processing = processing; // true/false observable
            this.wizardState = wizardState; // object shared between all steps
        },

        canContinue: function() {
            return true;
        },

        beforeShowing: function() {
        },

        afterShowing: function() {
        },

        complete: function(callback, abort) {
            callback();
        },

        next: function() {
            this.wizard.next();
        },

        nextTooltip: function() {
            return '';
        },
        
        assertInWizardState: function () {
            for (var i = 0, l = arguments.length; i < l; i++) {
                if (!(arguments[i] in this.wizardState)) {
                    var requiredArguments = Array.prototype.join.call(arguments, ', ');
                    throw new Error('Missing parameter "' + arguments[i] + '" from wizardState. Required parameters: ' + requiredArguments);
                }
            }
        }
    });
});