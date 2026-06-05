define(function(require) {
    var ko = require('lib/knockout');



    var dataSource = function(options) {
        if (typeof options.load !== 'function')
            throw new Error('dataSource: load must be a function returning a promise');
        if (!options.owner)
            throw new Error('dataSource: owner must be set');

        this.options = options;

        options.reloadOn = options.reloadOn || [];

        var observable = ko.observableArray();
        observable.__ds = options;
        _.extend(observable, dataSource.fn);
        _.bindAll(observable, 'dispose', 'load');

        options.reloadOn.forEach(function (eventConfig) {
            eventConfig[0].on(eventConfig[1], observable.load);
        });

        if (options.autoLoad)
            observable.load();

        return observable;
    };

    dataSource.fn = {
        dispose: function () {
            var observable = this;
            var options = this.__ds;
            options.reloadOn.forEach(function(eventConfig) {
                eventConfig[0].off(eventConfig[1], observable.load);
            });
        },

        load: function() {
            var observable = this;
            var options = this.__ds;

            var processing = options.owner.processing || _.identity;

            processing(true);

            options.load()
                .then(function(result) {
                    processing(false);
                    observable(result);
                }, function(error) {
                    processing(false);

                    if (options.owner.handleError)
                        options.owner.handleError(observable, error);
                    else
                        console.error('dataSource load failed:', error);
                });
        }
    };

    return {
        create: dataSource
    };
});