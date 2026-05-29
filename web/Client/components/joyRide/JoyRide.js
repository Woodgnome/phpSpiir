define(function(require) {
    var core = require('framework/core');
    var template = require('template!JoyRide');
    var joyRideService = require('services/joyRideService');
    var ChartTooltipBase = require('components/ChartTooltipBase');
    var expose = require('utilities/expose');


    var ko = core.ko;

    var transitionSpeed = 500;

    function formatContent(content) {
        if (content.indexOf('<') >= 0)
            return content; // don't modify HTML

        return content.split(/\n+/).map(function(paragraph) { return '<p>' + paragraph + '</p>'; }).join('');
    }

    function procedural() {
        var functionQueue = Array.prototype.slice.call(arguments);

        function processQueue(resultFromLastFunction) {
            if (functionQueue.length === 0)
                return;
            else {
                var next = functionQueue.shift();

                var returnValue = next(resultFromLastFunction);
                if (returnValue === procedural.stop)
                    return;

                $.when(returnValue).then(processQueue);
            }
        }

        processQueue();
    }

    procedural.stop = {};

    var JoyRide = core.IndependentComponent.extend({
        template: template,

        constructor: function(id, steps, onClose) {
            this.id = id;
            this.steps = steps;
            this.title = ko.observable();
            this.content = ko.observable();
            this.currentStepIndex = -1;
            this.buttonText = ko.observable();
            this.actions = ko.observableArray();
            this.onClose = onClose || function() {
            };
            this.addToDom({ hidden: true });

            _.bindAll(this, 'closeOnEscape', 'handleAction', 'rePosition');
        },

        begin: function() {
            if ($('.introTooltip:visible, .modal:visible').length > 0)
                return;

            $(window).on('resize', this.rePosition);
            $(document).on('scroll', this.rePosition);
            $(document).on('keyup', this.closeOnEscape);
            this.next();
        },

        _callStepHandler: function(step, handler) {
            if (step && step[handler])
                return step[handler]($(step.element), this);
        },

        next: function(optionalStepIndex) {
            var me = this;

            var step;

            var nextStepIndex = _.isNumber(optionalStepIndex) ? optionalStepIndex : me.currentStepIndex + 1;
            var nextStep = this.steps[nextStepIndex];

            // Jump over steps where element is not found
            while (nextStep && nextStep.element && $(nextStep.element).length === 0) {
                nextStepIndex++;
                nextStep = this.steps[nextStepIndex];
            }

            procedural(
                function() {
                    return me._callStepHandler(me.steps[me.currentStepIndex], 'after');
                },
                function() {
                    me.currentStepIndex = nextStepIndex;
                    step = nextStep;
                    if (!step) {
                        me.close();
                        return procedural.stop;
                    }

                    return me._callStepHandler(step, 'before');
                },
                function() {
                    me._showStep(step);
                }
            );
        },

        goToStep: function(id) {
            var stepIndex = -1;
            for (var i = 0; i < this.steps.length; i++)
                if (this.steps[i].id === id)
                    stepIndex = i;

            if (stepIndex === -1)
                throw new Error('goToStep: No step with ID ' + id);

            this.next(stepIndex);
        },

        _getTooltipPosition: function(step) {
            if (!step.element) {
                return {
                    x: $('.page').width() / 2,
                    y: $(window).height() / 2,
                    position: 'center'
                };
            }

            var stepElement = $(step.element);
            var stepElementPos = stepElement.offset();

            var pos = {
                x: step.position === 'left'
                    ? stepElementPos.left
                    : step.position === 'right'
                        ? stepElementPos.left + stepElement.outerWidth()
                        : stepElementPos.left + stepElement.outerWidth() / 2,
                y: step.position === 'left' || step.position === 'right'
                    ? stepElementPos.top + stepElement.outerHeight() / 2
                    : stepElementPos.top,
                spaceAbove: 20,
                spaceBelow: stepElement.outerHeight() + 20,
                position: step.position || 'above'
            };

            return pos;
        },

        _showStep: function(step) {
            var me = this;

            var tooltipPos = this._getTooltipPosition(step);

            var updateAndShowTooltip = function() {
                me.element.find('.arrow').toggle(!!step.element);

                me.content(formatContent(step.content));
                me.title(step.title);

                if (step.actions)
                    me.actions(step.actions);
                else
                    me.actions([{ label: step.buttonText || 'Videre &raquo;', action: 'next', primary: true }]);

                ChartTooltipBase.positionAndShowTooltip(_.extend({
                    element: me.element,
                    autoHide: false,
                    speed: transitionSpeed / 2
                }, tooltipPos));
            };

            if (me.currentStepIndex > 0)
                this.element.fadeOut(transitionSpeed / 4, updateAndShowTooltip).delay(transitionSpeed / 2);
            else
                updateAndShowTooltip();

            if (step.element) {
                var stepElement = $(step.element);
                if (!step.fixed)
                    stepElement.scrollIntoView({ spaceAbove: this.element.outerHeight() + 50, spaceBelow: 30, speed: transitionSpeed });
                expose(stepElement, transitionSpeed, 'joyRide');
            } else {
                this.element.scrollIntoView({ spaceAbove: this.element.outerHeight(), spaceBelow: this.element.outerHeight(), speed: transitionSpeed });
                expose('none', transitionSpeed, 'joyRide');
            }

            joyRideService.markStepAsSeen(this.id, this.currentStepIndex + 1);
        },

        rePosition: function() {
            var step = this.steps[this.currentStepIndex];

            if (step.fixed) {
                var tooltipPos = this._getTooltipPosition(step);
                ChartTooltipBase.positionAndShowTooltip(_.extend({
                    element: this.element,
                    autoHide: false,
                    speed: 0
                }, tooltipPos));
                expose($(step.element), 0, 'joyRide');
            }
        },

        handleAction: function(action) {
            if (typeof action.action === 'function')
                action.action.call(this);
            else if (action.action === 'next')
                this.next();
            else if (action.action === 'close')
                this.close();
            else if (action.action.match(/^goto\((\w+)\)$/))
                this.goToStep(RegExp.$1);
            else if (action.action.match((/^url\((.+)\)$/)))
                location.assign(RegExp.$1);
            else
                throw new Error('Unsupported JoyRide action ' + action);
        },

        close: function() {
            expose(null);

            $(document).off('keyup', this.closeOnEscape);
            $(window).off('resize', this.rePosition);
            $(document).off('scroll', this.rePosition);

            this.element.hide();
            this.currentStepIndex = -1;

            this.onClose();
        },

        closeOnEscape: function(event) {
            if (event.keyCode == 27) {
                this.close();
                return false;
            }
        }
    });

    JoyRide.delay = function(duration) {
        return $.Deferred(function(d) {
            setTimeout(function() {
                d.resolve();
            }, duration);
        });
    };

    return JoyRide;
});