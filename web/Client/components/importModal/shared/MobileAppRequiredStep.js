define(function(require) {
    var core = require('framework/core');
    var template = require('template!MobileAppRequiredStep');
    var Step = require('components/wizard/Step');

    return Step.extend({
        template: template,

        nextLabel: 'Close',

        constructor: function() {
            this.base.apply(this, arguments);
        },
    });
});
