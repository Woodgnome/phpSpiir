define(function(require) {
    var core = require('framework/core');
    var utilities = require('utilities/utilities');
    var charting = require('./charting');
    var config = require('config');


    var ko = core.ko;

    ko.bindingHandlers.listOptions = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var allBindings = allBindingsAccessor();
            var optionsText = allBindings.optionsText;
            var reverse = allBindings.reverse || false;

            var formatItem = optionsText
                ? function(item) { return item[optionsText]; }
                : function(item) { return item.toString(); };

            var items = ko.utils.unwrapObservable(valueAccessor());

            if (reverse) {
                items = _.clone(items);
                items.reverse();
            }

            $(element)
                .html(
                    '<span class="current"></span>'
                        + '<ul>'
                            + $.map(items, function(item) { return '<li><a href="#">' + formatItem(item) + '</a></li>'; }).join('')
                                + '</ul>'
                );
        }
    };

    ko.bindingHandlers.listValue = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var allBindings = allBindingsAccessor();
            var value = valueAccessor();
            var reverse = allBindings.reverse || false;

            $(element)
                .on('click', 'a', function(event) {
                    event.preventDefault();
                    var index = $(element).find('a').index(this);

                    var items = ko.utils.unwrapObservable(allBindings.listOptions);
                    if (reverse) {
                        items = _.clone(items);
                        items.reverse();
                    }

                    value(items[index]);
                });
        },

        update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var optionsText = allBindingsAccessor().optionsText;

            var formatItem = optionsText
                ? function(item) { return item[optionsText]; }
                : function(item) { return item.toString(); };

            var value = ko.utils.unwrapObservable(valueAccessor());

            $(element).find('.current').text(formatItem(value));
        }
    };


    ko.bindingHandlers.comboboxSource = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var allBindings = allBindingsAccessor();

            var source = ko.utils.unwrapObservable(valueAccessor());
            var options = { source: source };

            var comboboxValueAccessor = allBindings.comboboxValue;

            if (comboboxValueAccessor) {
                // TODO: Move this into comboboxValue.init below. Requires changing the combobox to accepting onSelect afterwards
                options.onSelect = function(newValue) {
                    comboboxValueAccessor(newValue);
                };
            }

            var comboboxOptionsAccessor = allBindings.comboboxOptions;

            if (comboboxOptionsAccessor)
                $.extend(options, ko.utils.unwrapObservable(comboboxOptionsAccessor));

            $(element).combobox(options);
        },

        update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var source = ko.utils.unwrapObservable(valueAccessor());
            $(element).combobox('setSource', source);
        }
    };

    ko.bindingHandlers.comboboxValue = {
        //    init: function (element, valueAccessor) {
        //        TODO: Define onSelect handler of combobox here
        //    },

        update: function (element, valueAccessor) {
            $(element).combobox('setValue', ko.utils.unwrapObservable(valueAccessor()));
        }
    };

    (function () {
        function convertOptionsToSource(options, config) {
            return options.map(function(option) {
                return {
                    value: option[config.optionsValue],
                    label: option[config.optionsText],
                    selectable: true
                };
            });
        }

        // Simple combobox binding that is more similar to the standard options binding than comboboxSource/comboboxValue.
        // The primary advantage is that there is no need to prepare the data source manually.
        //
        // Example usage with all required parameters:
        //    <input data-bind="combobox: { value: valueObservable, options: optionsOptinallyObservable, optionsText: 'textPropName', optionsValue: 'valuePropName' }"/>
        //
        // Options for the combobox jQuery plugin can simply be added to the binding object.
        ko.bindingHandlers.combobox = {
            init: function(element, valueAccessor) {
                var config = valueAccessor();

                var valueObservable = config.value;
                var optionsObservable = config.options;

                $(element).combobox(_.extend({}, config, {
                    source: [],
                    onSelect: function (value) {
                        var options = ko.utils.unwrapObservable(optionsObservable);
                        var option = options.find(function (o) { return o[config.optionsValue] === value; });
                        valueObservable(option);
                    }
                }));

                // Handle updates using computed observables instead of implementing an update method for the binding.
                // Ensures that source or value are updated separately.
                // See http://www.knockmeout.net/2012/06/knockoutjs-performance-gotcha-3-all-bindings.html
                ko.computed({
                    read: function() {
                        var updatedOptions = ko.utils.unwrapObservable(optionsObservable);
                        $(element).combobox('setSource', convertOptionsToSource(updatedOptions, config));
                    },
                    owner: this,
                    disposeWhenNodeIsRemoved: element
                });

                ko.computed({
                    read: function() {
                        var selectedOption = ko.utils.unwrapObservable(config.value);
                        $(element).combobox('setValue', selectedOption ? selectedOption[config.optionsValue] : null);
                    },
                    owner: this,
                    disposeWhenNodeIsRemoved: element
                });
            }
        };
    })();

    ko.localizedNumberDependantObservable = function(numberObservable, allowNull) {
        return ko.dependentObservable({
            read: function() {
                var newFloatValue = numberObservable();
                if (newFloatValue === null)
                    return '';

                if (newFloatValue % 1 != 0)
                    newFloatValue = parseFloat(newFloatValue.toFixed(2));

                return utilities.floatToLocalizedString(newFloatValue);
            },
            write: function(value) {
                var number = utilities.parseFloatLocalized(value);

                if (isNaN(number)) {
                    numberObservable(allowNull ? null : 0);
                    return;
                }

                if (number < numberObservable.minimum || number > numberObservable.maximum) {
                    numberObservable(allowNull ? null : 0);
                    return;
                }

                if (number % 1 != 0)
                    number = parseFloat(number.toFixed(2));

                numberObservable(number);
            }
        });
    };


    ko.numericObservable = function (initialValue, options) {
        var actual = ko.observable(initialValue);

        if (typeof options === 'boolean')
            options = { allowNull: options };

        options = _.extend({
            allowNull: false,
            minimum: undefined,
            maximum: undefined
        }, options);

        var result = ko.dependentObservable({
            read: function () {
                return actual();
            },
            write: function (newValue) {
                if (newValue === null && options.allowNull)
                    actual(null);
                else if (!_.isNumber(newValue))
                    throw 'numericObservable: Something else than number given. Value: ' + newValue + ', Options: ' + JSON.stringify(options);
                else if (newValue < options.minimum || newValue > options.maximum)
                    throw 'numericObservable: Value out of range. Value: ' + newValue + ', Options: ' + JSON.stringify(options);
                else
                    actual(parseFloat(newValue));
            }
        });

        result.allowNull = options.allowNull;
        result.minimum = options.minimum;
        result.maximum = options.maximum;
        result.__spiir_proto__ = ko.numericObservable;

        return result;
    };


    (function() {
        var allowedKeys = { };

        for (var i = 48; i <= 57; i++) //  numbers
            allowedKeys[i] = true;

        allowedKeys[44] = true; //  comma
        allowedKeys[45] = true; //  minus

        ko.bindingHandlers.numericValue = {
            init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var observable = valueAccessor();

                element.maxLength = 15;

                if (observable.__spiir_proto__ !== ko.numericObservable)
                    throw 'numericValue binding error: Can only bind to instances of numericObservable';

                if (!observable.formattedObservable)
                    observable.formattedObservable = ko.localizedNumberDependantObservable(observable, observable.allowNull);

                var valueUpdate = allBindingsAccessor().numericValueUpdate || 'keyup';

                $(element)
                    .bind(valueUpdate, function() {
                        observable.formattedObservable(this.value);
                    })
                    .bind('keypress', function(event) {
                        // Allow Ctrl/Cmd+everything
                        if (event.metaKey || event.ctrlKey)
                            return;

                        // Firefox triggers keypress on non-character keys, such as arrows and backspace
                        if ($.browser.mozilla && event.keyCode !== 0)
                            return;

                        if (!allowedKeys[event.which])
                            event.preventDefault();
                    })
                    .bind('blur', function() {
                        this.value = observable.formattedObservable();
                    });
            },

            update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
                var observable = valueAccessor();

                var currentNumber = utilities.parseFloatLocalized(element.value);
                if (currentNumber !== ko.utils.unwrapObservable(observable))
                    element.value = observable.formattedObservable();
            }
        };
    })();

    ko.bindingHandlers.animated = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var methods = {
                slide: { show: 'slideDown', hide: 'slideUp' },
                fade: { show: 'fadeIn', hide: 'fadeOut' },
                fadeOut: { show: 'show', hide: 'fadeOut'}
            };

            function animate(element, method, speed) {
                if (_.isFunction(method))
                    method.call(element, speed);
                else
                    element[method](speed);
            }

            element = $(element);

            var config = ko.utils.unwrapObservable(valueAccessor());
            var effect = config.effect || 'slide';
            var speed = config.speed;
            var visible = ko.utils.unwrapObservable(config.visible);

            if (!element.data('__animatedInit')) {
                element.data('__animatedInit', true);
                $(element).toggle(visible);
                return;
            }

            _.delay(function() {
                if (visible) {
                    if (!element.is(':visible'))
                        animate(element, methods[effect].show, speed);
                } else {
                    if (element.is(':visible'))
                        animate(element, methods[effect].hide, speed);
                }
            });
        }
    };

    ko.bindingHandlers.tooltip = {
        init: function(element, valueAccessor, allBindingsAccessor) {
            var options = _.extend({
                location: 'center',
                width: null
            }, allBindingsAccessor().tooltipOptions);

            $(element).addClass('has-tooltip');

            var tip = $('<div class="tooltip ' + options.location + '"><span class="arrow"/><span class="content"></span></div>')
                .hide()
                .css('position', 'absolute')
                .insertAfter(element);

            if (options.width !== null)
                tip.width(options.width);

            var hideTimer = null;

            $(element)
                .parent()
                .on('mouseenter', '.has-tooltip', function() {
                    clearTimeout(hideTimer);

                    if (!tip.data('enabled'))
                        return;

                    if (tip.is(':visible'))
                        return;

                    tip.show()
                        .position({
                            my: options.location + ' bottom',
                            at: options.location + ' top',
                            of: element,
                            offset: '0 -15px'
                        })
                        .hide()
                        .fadeIn('fast');
                })
                .on('mouseleave', '.has-tooltip',function() {
                    hideTimer = setTimeout(function() {
                        if (!tip.data('enabled')) return;
                        tip.fadeOut('fast');
                    }, 100);
                });

            // This is to fix flickering when the tooltip is visible
            tip.on('mouseenter', function() {
                clearTimeout(hideTimer);
            }).on('mouseleave', function() {
                hideTimer = setTimeout(function() {
                    tip.fadeOut('fast');
                }, 100);
            });
        },

        update: function(element, valueAccessor) {
            var content = ko.utils.unwrapObservable(valueAccessor());

            var tip = $(element).next();
            var enabled = !!content;
            tip.data('enabled', enabled);

            if (enabled)
                tip.find('.content').html(content);
            else
                tip.hide();
        }
    };

    // TODO: Merge with the tooltip binding
    // This binding is for showing/hiding complex tooltips which inherit from TooltipBase.
    ko.bindingHandlers.tooltipBase = {
        init: function (element, valueAccessor) {
            var tooltip = ko.utils.unwrapObservable(valueAccessor());

            $(element)
                .bind('mousemove', function() {
                    tooltip.show(element);
                })
                .bind('mouseleave', function () {
                    tooltip.hideAfterTimeout();
                });
        }
    };

    ko.bindingHandlers.enter = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var handler = valueAccessor();

            $(element).bind('keyup', function(event) {
                if (event.keyCode === 13) {
                    event.preventDefault();
                    handler.call(viewModel);
                }
            });
        }
    };

    ko.bindingHandlers.chart = {
        update: function(element, valueAccessor) {
            var chartOptions = ko.utils.unwrapObservable(valueAccessor());
            element = $(element);

            if (element.data('chart')) {
                element.data('chart').destroy();
                element.data('chart', null);
            }

            if (!chartOptions) {
                element.empty();
                return;
            }

            var id = element.attr('id');
            if (!id) {
                id = utilities.createUniqueId();
                element.attr('id', id);
            }

            if (!chartOptions.chart)
                chartOptions.chart = { };

            chartOptions.chart.renderTo = id;

            try {
                element.data('chart', new Highcharts.Chart(chartOptions));
            } catch (e) {
                if (typeof e !== 'string' || e.indexOf('Highcharts error #13') === -1)
                    throw e;

                var message = 'Highcharts error #13 thrown. Element ID: ' + id
                    + ', element.length: ' + element.length
                    + ', getElementById finds element: ' + (!!document.getElementById(id));

                throw new Error(message);
            }

        }
    };

    ko.bindingHandlers.fadeVisible = {
        init: function(element, valueAccessor) {
            var value = valueAccessor();
            $(element).toggle(ko.utils.unwrapObservable(value));
        },

        update: function(element, valueAccessor) {
            var value = valueAccessor();
            ko.utils.unwrapObservable(value) ? $(element).fadeIn() : $(element).fadeOut();
        }
    };

    ko.bindingHandlers.formatNumber = {
        update: function(element, valueAccessor, allBindingsAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).text(utilities.formatPrice(value));

            var currency = allBindingsAccessor().currency;
            if (currency) {
                element.setAttribute('data-currency-symbol', currency.symbol);
            }
        },

        stringRender: function(bindingValue, style, attributes, addToContent) {
            addToContent(utilities.formatPrice(bindingValue));
        }
    };

    ko.bindingHandlers.formatFlippedNumber = {
        update: function (element, valueAccessor, allBindingsAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            $(element).text(utilities.formatPrice(value*-1));

            var currency = allBindingsAccessor().currency;
            if (currency) {
                element.setAttribute('data-currency-symbol', currency.symbol);
            }
        },

        stringRender: function (bindingValue, style, attributes, addToContent) {
            addToContent(utilities.formatPrice(bindingValue*-1));
        }
    };

    ko.bindingHandlers.formatDate = {
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());

            var formatted = '';
            var format = null;
            var date;
            var capitalize = false;

            if (_.isObject(value) && 'date' in value) {
                format = value.format;
                date = ko.utils.unwrapObservable(value.date);
                capitalize = value.capitalize || false;
            } else {
                date = value;
            }

            if (_.isString(date))
                date = Date.fromIsoDate(date);

            if (_.isDate(date) && !isNaN(date.getTime()))
                formatted = Date.format(format, date, capitalize);

            $(element).text(formatted);
        }
    };

    ko.bindingHandlers.summarize = {
        update: function(element, valueAccessor) {
            var value = valueAccessor();
            var text = ko.utils.unwrapObservable(value.text);

            var formatted = text ? utilities.summarize(text, value.length) : '';

            $(element).text(formatted);
        }
    };

    ko.bindingHandlers.formatMonth = {
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var defaultFormat = '%B %Y';
            var formatted = _.isString(value)
                ? utilities.formatMonth(defaultFormat, value, true)
                : utilities.formatMonth(value.format || defaultFormat, ko.utils.unwrapObservable(value.month), value.capitalize);

            $(element).text(formatted);
        }
    };

    ko.bindingHandlers.tap = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var handler = valueAccessor();
            var eventValue = { };
            eventValue[core.isTouchDevice ? 'tap' : 'click'] = handler;

            return ko.bindingHandlers.event.init.call(this, element, function() { return eventValue; }, allBindingsAccessor, viewModel);
        }
    };

    ko.bindingHandlers.buttonGroup = {
        init: function(element, valueAccessor) {
            var config = valueAccessor();
            var value = config.value;

            $(element)
                .addClass('btn-group')
                .html(config.options.map(function (opt) {
                    return '<button type="button" class="btn">' + opt.label + '</button>';
                }).join(''))
                .on('click', 'button', function() {
                    var button = $(this);
                    button.parent().find('.active').removeClass('active');
                    button.addClass('active');

                    value(config.options[button.index()].value);
                });
        },

        update: function(element, valueAccessor) {
            var config = valueAccessor();
            var newValue = ko.utils.unwrapObservable(config.value);
            var buttons = $(element).find('button').removeClass('active');

            if ('disable' in config) {
                var disable = ko.utils.unwrapObservable(config.disable);
                buttons.prop('disabled', disable);
            }

            var option = config.options.find(function(opt) { return opt.value === newValue; });
            if (newValue !== null && !option)
                throw new Error('buttonGroup binding: Tried to set invalid value "' + newValue + '" to group.');

            var index = config.options.indexOf(option);

            if (index >= 0)
                buttons.eq(index).addClass('active');
        }
    };

    ko.bindingHandlers.submitSpinner = {
        init: function(element) {

            var submitButtonParent = $(element).parent();
            var spinner = $('<span class="submitWaiting"/>').hide();

            submitButtonParent
                .css('position', 'relative')
                .prepend(spinner);
        },

        update: function (element, valueAccessor) {
            element = $(element);
            var visible = ko.utils.unwrapObservable(valueAccessor());
            var spinner = element.parent().find('.submitWaiting');

            if (visible) {
                var buttonPos = element.position();

                spinner.show().css({
                    left: buttonPos.left,
                    top: buttonPos.top + element.outerHeight() / 2
                });
            } else {
                spinner.hide();
            }
        }
    };

    ko.bindingHandlers.assetUrl = {
        init: function(element, valueAccessor) {
            var options = valueAccessor();
            if (!options.path || !options.urlId)
                throw new Error('assetUrl binding: Missing either of urlId and path options.');
            if (!config.urls[options.urlId])
                throw new Error('assetUrl binding: Unknown URL with ID ' + options.urlId);

            $(element).attr('src', config.urls[options.urlId] + '/' + options.path);
        }
    };

    ko.bindingHandlers.linkLabelsAndInputs = {
        init: function(element) {
            $(element).find('.field').each(function () {
                var id = utilities.createUniqueId();
                var field = $(this);
                field.find(':input:first').attr('id', id);
                field.find('label:first').attr('for', id);
            });
        }
    };

    ko.bindingHandlers.disableFields = {
        update: function(element, valueAccessor) {
            $(element).find(':input').prop('disabled', ko.utils.unwrapObservable(valueAccessor()));
        }
    };

    ko.bindingHandlers.autoFocus = {
        init: function (element, valueAccessor) {
            if (core.isTouchDevice)
                return;

            var shouldAutoFocus = ko.utils.unwrapObservable(valueAccessor());
            if (!shouldAutoFocus)
                return;

            _.defer(function () {
                $(element).focus();
            });
        }
    };
});
