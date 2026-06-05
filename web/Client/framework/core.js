define(function(require) {
    var Base = require('lib/Base');
    var knockout = require('lib/knockout');
    var koVal = require('lib/knockout.validation');
    var koValLoc = require('lib/knockout.validation-da');
    var bindingHandlers = require('./bindingHandlers');
    var EventHandlerMixin = require('./EventHandlerMixin');
    var Component = require('./Component');
    var Application = require('./Application');
    var Page = require('./Page');
    var StatePage = require('./StatePage');
    var IndependentComponent = require('./IndependentComponent');
    var Popup = require('./Popup');
    var hub = require('./hub');
    var utils = require('./utils');


        Array.prototype.find = function(iterator) {
            for (var i = 0, l = this.length; i < l; i++)
                if (iterator(this[i]))
                    return this[i];

            return undefined;
        };

        var profilingEnabled = false;

        return {
            Application: Application,
            Base: Base,
            Component: Component,
            EventHandlerMixin: EventHandlerMixin,
            IndependentComponent: IndependentComponent,
            ko: knockout,
            Page: Page,
            StatePage: StatePage,
            Popup: Popup,
            enableProfiling: function() {
                profilingEnabled = true;
                ko.bindingHandlers.component.enableProfiling();
            },
            profilingLog: function() {
                if (profilingEnabled)
                    console.log('[Profiling] ' + Array.prototype.join.call(arguments, ' '));
            },
            isTouchDevice: /Mobile|Android|Windows Phone/.test(navigator.userAgent),
            hub: hub,
            utils: utils
        };
    });
