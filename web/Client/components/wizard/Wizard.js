define(function(require) {
    var core = require('framework/core');
    var template = require('template!Wizard');


    var ko = core.ko;

    return core.Base.extend({
        template: template,

        constructor: function(stepClasses, initialState, options) {
            if (stepClasses.length === 0)
                throw 'No steps given to Wizards';

            options = _.extend({
                continueLabel: 'Videre',
                completeLabel: 'Kom i gang',
                canGoBack: false,
                removeStepOnBack: false
            }, options);

            this.__options = options;

            var me = this;
            this.processing = ko.processingObservable();
            this.wizardState = _.extend({}, initialState);
            this.sharedState = this.wizardState; // Legacy alias - TODO: Remove after porting Content into Client
            this.loadingStep = ko.observable(false).extend({ throttle: 300 });

            this.steps = ko.observableArray(stepClasses.map(function(stepClass) {
                return me.createStep(stepClass);
            }));

            this.showPager = ko.observable(true);
            this.currentIndex = ko.observable(-1);
            this.currentStep = ko.observable(null);

            this.nextLabel = ko.computed(function() {
                var currentStep = this.currentStep();
                if (currentStep && currentStep.nextLabel)
                    return ko.utils.unwrapObservable(currentStep.nextLabel);

                var atLastStep = this.currentIndex() === this.steps().length - 1;
                return atLastStep ? options.completeLabel : options.continueLabel;
            }, this);

            this.canContinue = ko.computed(function() {
                var currentStep = this.currentStep();
                return currentStep ? currentStep.canContinue() : true;
            }, this);

            this.nextTooltip = ko.computed(function() {
                var currentStep = this.currentStep();
                return currentStep ? currentStep.nextTooltip() : '';
            }, this);

            this.nextEnabled = ko.computed(function() {
                return !this.processing();
            }, this);

            this.previousVisible = ko.computed(function() {
                var currentStep = this.currentStep();
                var defaultValue = options.canGoBack && this.currentIndex() > 0;

                return currentStep &&  'canGoBack' in currentStep
                    ? ko.utils.unwrapObservable(currentStep.canGoBack)
                    : defaultValue;
            }, this);

            this.previousEnabled = ko.computed(function() {
                return !this.processing() && this.currentIndex() > 0;
            }, this);

            this.customActions = ko.computed(function() {
                var currentStep = this.currentStep();
                return currentStep ? currentStep.customActions : null;
            }, this);

            this.customLeftActions = ko.computed(function() {
                var currentStep = this.currentStep();
                return currentStep ? ko.utils.unwrapObservable(currentStep.customLeftActions) : null;
            }, this);

            this.showActions = ko.computed(function() {
                var currentStep = this.currentStep();
                return currentStep ? ko.utils.unwrapObservable(currentStep.showActions) : null;
            }, this);

            this.goToStep(0);
        },

        createStep: function(stepClass) {
            return new stepClass(this, this.processing, this.wizardState);
        },

        complete: function() {
        },

        next: function() {
            var me = this;
            if (!this.canContinue())
                return;

            this.processing(true);
            this.currentStep().complete(function() {
                me.processing(false);
                if (me.currentIndex() === me.steps().length - 1)
                    me.complete();
                else
                    me.goToStep(me.currentIndex() + 1);
            }, function() {
                me.processing(false);
            });
        },

        previous: function() {
            if (this.currentIndex() == 0)
                return;

            this.goToStep(this.currentIndex() - 1);

            if (this.__options.removeStepOnBack) {
                var step = this.steps.pop();
                if (step.dispose)
                    step.dispose();
            }
        },

        addStep: function (stepClass) {
            this.steps.push(this.createStep(stepClass));
        },

        replaceCurrentStep: function (stepClass) {
            var me = this;

            var currentStep = this.currentStep();
            if (typeof currentStep.dispose === 'function')
                currentStep.dispose();

            var newStep = this.createStep(stepClass);

            this.steps.splice(this.currentIndex(), 1, newStep);
            this.goToStep(this.currentIndex());
        },

        replaceStepsAndRestart: function (stepClasses) {
            var me = this;

            if (stepClasses.length < 1)
                throw new Error('replaceStepsAndRestart: Must be given one ore more steps.');

            this.disposeSteps();
            this.steps(stepClasses.map(function (stepClass) {
                return me.createStep(stepClass);
            }));
            this.goToStep(0);
        },

        goToStep: function (i) {
            var me = this;

            if (i < 0 || this.steps().length - 1 < i)
                return;

            if (this.currentStep())
                this.currentStep().visible(false);

            this.currentIndex(i);
            this.currentStep(this.steps()[i]);

            var beforeShowingReturnValue = this.currentStep().beforeShowing();
            this.loadingStep(true);

            $.when(beforeShowingReturnValue).then(function () {
                me.loadingStep(false);
                me.currentStep().visible(true); 
                _.delay(function () {
                    me.currentStep().afterShowing();
                });
            });
        },

        dispose: function () {
            this.disposeSteps();
        },
        
        disposeSteps: function() {
            this.steps().forEach(function (step) {
                if (typeof step.dispose === 'function')
                    step.dispose();
            });
        }
    });
});