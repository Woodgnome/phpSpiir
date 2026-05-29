define(function(require) {
    var Page = require('./Page');
    var ko = require('lib/knockout');


    // Extended Page base class which keep tracks of page state, updating the UI on state change. 
    //
    // Features:
    // * Multiple changes in state only result in single change in UI (this is THE feature)
    // * URL can be updated to match state (if updateUrlToMatchState is implemented)

    return Page.extend({
        constructor: function() {
            if (!this.getStateObject)
                throw new Error('StatePage: Missing getStateObject, which must be created before calling base constructor.');
            
            if (!this.updateUI)
                throw new Error('StatePage: Missing updateUI from class.');

            // Potential state is a throttled observable, allowing for multiple updates of state observables without
            // triggering multiple UI updates.
            var potentialState = ko.computed(this.getStateObject, this).extend({ throttle: 1 });

            // Keep current state in a normal variable as well as an observable, so that it can be read
            // without triggering a subscription.
            this.__currentState = potentialState();

            this.state = ko.observable(this.__currentState);

            ko.computed(function() {
                var newState = potentialState();

                var currentState = this.__currentState;
                if (_.isEqual(currentState, newState))
                    return;

                this.__currentState = newState;
                this.state(newState);
            }, this);

            this.state.subscribe(function(newState) {
                if (this.__preventUpdatingUrl)
                    this.__preventUpdatingUrl = false;
                else
                    this.updateUrlToMatchState(newState);

                this.updateUI();
            }, this);

            this.base.apply(this, arguments);
        },

        setState: function(newState, calledFromAction) {
            // Call this when updating page state programatically

            if (calledFromAction)
                this.__preventUpdatingUrl = true;

            newState = _.extend({ }, this.__currentState, newState);
            if (_.isEqual(this.__currentState, newState)) {
                if (calledFromAction)
                    this.state.notifySubscribers(this.state());
            } else {
                for (var k in newState)
                    if (newState.hasOwnProperty(k))
                        this[k](newState[k]);
            }
        },
        
        updateUrlToMatchState: function(newState) {
        }
    });
});