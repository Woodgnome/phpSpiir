define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountTypeTooltip');
    var TooltipBase = require('components/TooltipBase');


    return TooltipBase.extend({
        template: template,

        constructor: function() {
            this.base({ disableMouseEvents: true, position: 'above', disposeOnClose: false });
        }
    });
});