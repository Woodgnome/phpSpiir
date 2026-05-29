define(function(require) {
    var ko = require('lib/knockout');
    var Application = require('./Application');
    var Base = require('lib/Base');
    var StringBasedComponentRenderer = require('./StringBasedComponentRenderer');
    var config = require('config');



    var componentTemplates = {};

    (function() {
        var templateData = {};

        var ComponentTemplateSource = function(templateName) {
            this.templateName = templateName;
        };

        _.extend(ComponentTemplateSource.prototype, {
            text: function(valueToWrite) {
                if (arguments.length === 0) {
                    if (!(this.templateName in componentTemplates))
                        throw 'componentTemplateSource: Template ' + this.templateName + ' not found';

                    return componentTemplates[this.templateName].content;
                } else {
                    componentTemplates[this.templateName].content = valueToWrite;
                }
            },

            data: function(key, valueToWrite) {
                templateData[this.templateName] = templateData[this.templateName] || {};

                if (arguments.length === 1) {
                    return templateData[this.templateName][key];
                } else {
                    templateData[this.templateName][key] = valueToWrite;
                }
            }
        });

        // Creates a sub-class of Knockout's native template engine, using componentTemplateSource
        ko.createComponentTemplateEngine = function() {
            var templateEngine = new ko.nativeTemplateEngine();
            templateEngine.makeTemplateSource = function(templateName) {
                return new ComponentTemplateSource(templateName);
            };

            return templateEngine;
        };
    })();

    ko.setTemplateEngine(ko.createComponentTemplateEngine());

    /* component binding:
     *
     * An extended template binding, with automatic template lookup, and back-reference 
     * to the element rendered.
     * 
     * Classes defined using the namespace function get automatic template lookup, based on 
     * the fully qualified class name. As an example, assume
     *   JS: viewModel.obj = new S.UI.SomeClass() 
     *   HTML: data-bind="component: obj" 
     * Then the component binding automatically renders the template S/UI/SomeClass.html
     * (given that the template is part of a loaded template set).
     *
     * The binding sets the property 'elements' on the object, allowing it to refer back
     * to the HTML, which is useful e.g. when using jQuery plugins not supported by Knockout.
     */
    (function() {
        var stringRenderer = new StringBasedComponentRenderer(function(component) {
            var templateName = getTemplateName(component);
            return componentTemplates[templateName].content;
        });

        ko.bindingHandlers.component = {
            init: function(element, valueAccessor) {
                var value = valueAccessor();

                if (!ko.utils.unwrapObservable(value)) {
                    $(element).empty();
                    return;
                }

                var unwrapped = ko.utils.unwrapObservable(value);
                if (unwrapped.templateEngine === 'string')
                    return ko.bindingHandlers.html.init.call();

                var options = createTemplateOptions(element, value);

                return ko.bindingHandlers.template.init.call(this, element, function() { return options; });
            },

            update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var value = valueAccessor();

                if (!ko.utils.unwrapObservable(value)) {
                    $(element).empty();
                    return;
                }

                var options = createTemplateOptions(element, value);

                var unwrapped = ko.utils.unwrapObservable(value);
                if (unwrapped.templateEngine === 'string') {
                    var result = stringRenderer.render(unwrapped);
                    var htmlBindingReturnValue = ko.bindingHandlers.html.update.call(this, element, function() { return result.html; });
                    if (unwrapped.afterRender)
                        unwrapped.afterRender([element], result.componentsById);
                    result.callbacks.forEach(function(cb) { cb(); });

                    return htmlBindingReturnValue;
                }

                return ko.bindingHandlers.template.update.call(this, element, function() { return options; }, allBindingsAccessor, viewModel, bindingContext);
            },

            enableProfiling: function() {
                var callStack = [];
                console.log('Enabling profiling for the component binding. Reload the page to disable.');
                var originalUpdate = this.update;
                var cleanNameRegex = /^[\.\/]+/;

                this.update = function(element, valueAccessor) {
                    var value = ko.utils.unwrapObservable(valueAccessor());
                    var templateName;

                    if (_.isArray(value)) {
                        if (value.length === 0)
                            templateName = '<empty array>';
                        else {
                            templateName = value.length + '*' + getNameFromComponent(value[0]);
                        }
                    } else if (value) {
                        templateName = getNameFromComponent(value);
                    } else {
                        templateName = '<null>';
                    }

                    function getNameFromComponent(component) {
                        if (component.template && component.template.name)
                            return component.template.name.replace(cleanNameRegex, '');
                        if (component.constructor && component.constructor.__templateName__ && componentTemplates[component.constructor.__templateName__].name)
                            return componentTemplates[component.constructor.__templateName__].name.replace(cleanNameRegex, '');

                        return '<unknown>';
                    }

                    var parentCall = callStack.length > 0 ? callStack[callStack.length - 1] : null;

                    var call = {
                        template: templateName,
                        start: Date.now(),
                        childDuration: 0,
                        childCount: 0,
                        indent: parentCall ? parentCall.indent + '   ' : '',
                        startMessageShown: false
                    };

                    if (parentCall && !parentCall.startMessageShown) {
                        console.log(parentCall.indent + '- ' + parentCall.template + ':');
                        parentCall.startMessageShown = true;
                    }

                    callStack.push(call);
                    var returnValue = originalUpdate.apply(this, arguments);
                    callStack.pop();

                    var duration = Date.now() - call.start;

                    if (parentCall) {
                        parentCall.childDuration += duration;
                        parentCall.childCount++;
                    }

                    var message = call.indent + '- Rendered ' + call.template + ' in ' + duration + ' ms';
                    if (call.childCount)
                        message += ' (own time: ' + (duration - call.childDuration) + ' ms)';
                    console.log(message);

                    return returnValue;
                };
            }
        };

        function createTemplateOptions(element, value) {
            var unwrapped = ko.utils.unwrapObservable(value);

            if (!_.isArray(unwrapped)) {
                value.elements = [element];

                return {
                    data: value,
                    name: getTemplateName(unwrapped),
                    afterRender: function(elements, model) {
                        if (_.isFunction(model.afterRender))
                            model.afterRender(elements);
                    }
                };
            } else if (unwrapped) {
                return {
                    foreach: value,
                    name: function(object) {
                        return getTemplateName(object);
                    },
                    afterRender: function(elements, model) {
                        model.elements = elements;
                        if (_.isFunction(model.afterRender))
                            model.afterRender(elements);
                    }
                };
            }
        }

        var sequence = 0;

        function getTemplateName(object) {
            var objectWithName = object instanceof Base ? object.constructor : object;
            var templateName = objectWithName.__templateName__;

            if (!templateName) {
                if (!object.template)
                    throw new Error('component binding: Component is missing template');

                templateName = objectWithName.__templateName__ = 'c' + (sequence++);
                componentTemplates[templateName] = _.isString(object.template) ? { content: object.template } : object.template;
            }

            return templateName;
        }
    })();


    ko.bindingHandlers.navigate = {
        update: function(element, valueAccessor) {
            element = $(element);
            var app = Application.instance;

            var options = ko.utils.unwrapObservable(valueAccessor());
            if (_.isString(options)) {
                options = {
                    routeId: options,
                    parameters: {}
                };
            }

            var route = app.router.getRouteById(options.routeId);

            var addClickHandler = true;

            if (element.is('a')) {
                var url = app.router.resolveAbsoluteUrl(options.routeId, options.parameters);
                element.attr('href', url);

                if (route.handler === 'server')
                    addClickHandler = false;
            }

            if (addClickHandler) {
                $(element).unbind('click')
                    .bind('click', function(event) {
                        event.preventDefault();
                        Application.instance.navigate(options.routeId, options.parameters, { trigger: true });
                    });
            }
        }
    };

    /*    
    ko.processingObservable:

    A special observable for keeping state of running operations. Supports multiple concurrent operations.
    Some kind of spinner or overlay is typically shown when the observable returns true, that is, when operations
    are in progress.

    Supports showing "on before unload" when operations are running. Call setBeforeUnloadMessage with as 
    message for configuring that.
    
    Examples:
      var processing = ko.processingObservable();
    
      processing.start();
      someService.methodReturningPromise()
           .then(processing.stop)
           .then(function() { ... });
    
      processing.start();
      $.get('/url/', function(response) {
          processing.stop(); 
          ...do something with response...
      });
    */
    ko.processingObservable = function() {
        var value = ko.observable(0);
        var beforeUnloadHandler = null;
        var beforeUnloadMessage = null;
        var processing = ko.computed({
            read: function() {
                return value() > 0;
            },
            write: function(newValue) {
                newValue = newValue ? 1 : -1;
                value(value() + newValue);

                if (value() > 0 && beforeUnloadMessage && !beforeUnloadHandler) {
                    beforeUnloadHandler = function() { return beforeUnloadMessage; };
                    $(window).on('beforeunload', beforeUnloadHandler);
                } else if (value() === 0 && beforeUnloadHandler) {
                    $(window).off('beforeunload', beforeUnloadHandler);
                    beforeUnloadHandler = null;
                }
            }
        });
        processing.start = function() {
            processing(true);
        };
        processing.stop = function() {
            processing(false);
        };
        processing.setBeforeUnloadMessage = function(message) {
            beforeUnloadMessage = message;
        };

        return processing;
    };

});