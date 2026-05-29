define(function(require) {


    return {
        observableMap: function(observable, iterator, context) {
            iterator = iterator.bind(context);

            var resultObservable = ko.observable(observable().map(iterator));
            var subscription = observable.subscribe(function(array) {
                resultObservable(array.map(iterator));
            }, this);

            resultObservable.dispose = function() {
                subscription.dispose();
            };

            return resultObservable;
        },

        observableMapNew: function(observable, klass, argument) {
            return this.observableMap(observable, function(item) {
                return new klass(item, argument);
            });
        }
    };
});