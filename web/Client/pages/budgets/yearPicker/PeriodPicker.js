define(function(require) {
    var core = require('framework/core');
    var template = require('template!PeriodPicker');


    var ko = core.ko;

    return core.Base.extend({
        template: template,

        constructor: function(options) {
            options = _.extend({
                mode: 'month',
                from: null,
                to: null,
                value: null,
                onChange: function(value) {
                }
            }, options);

            this.mode = options.mode;
            this.onChange = options.onChange;
            this.value = ko.observable(options.value);
            this.customLabels = {};

            this.formattedValue = ko.computed(function () {
                var customLabel = this.customLabels[this.value()];
                if (customLabel)
                    return customLabel;

                return this.mode === 'month' ? Date.fromMonth(this.value()).format('%b %Y') : this.value();
            }, this);

            this.hasPrevious = ko.computed(function() {
                return this.value() > options.from;
            }, this);

            this.hasNext = ko.computed(function() {
                return this.value() < options.to;
            }, this);
        },

        previous: function() {
            if (!this.hasPrevious())
                return;

            this.addToValue(-1);
            this.onChange(this.value());
        },

        next: function() {
            if (!this.hasNext())
                return;

            this.addToValue(1);
            this.onChange(this.value());
        },

        addToValue: function(change) {
            if (this.mode === 'month')
                this.value(Date.fromMonth(this.value()).addMonths(change).toMonthString());
            else
                this.value(this.value() + change);
        },

        setValue: function(value) {
            this.value(value);
        },

        setCustomLabel: function(value, label) {
            this.customLabels[value] = label;
        }
    });
});