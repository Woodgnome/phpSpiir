define(function(require) {
    var Base = require('lib/Base');
    var ko = require('lib/knockout');



    function styleToString(styleObject) {
        var output = '';
        for (var key in styleObject)
            output += key + ':' + styleObject[key] + ';';

        return output;
    }

    function attributesToString(attributeObject) {
        var output = '';
        for (var key in attributeObject)
            if (key !== 'data-bind')
                output += ' ' + key + '="' + attributeObject[key] + '"'; // TODO: Escape attribute values

        return output;
    }

    function renderNodes(nodes, viewModel, parents, renderComponent, afterRenderCallbacks, componentElementId) {
        var output = '';
        if (!nodes)
            return '';

        for (var i = 0, l = nodes.length; i < l; i++)
            output += renderNode(nodes[i], viewModel, parents, renderComponent, afterRenderCallbacks, componentElementId);

        return output;
    }

    function getAttributesFromNode(node) {
        var attributes = { };
        for (var i = 0, l = node.attributes.length; i < l; i++) {
            var attribute = node.attributes[i];
            attributes[attribute.name] = attribute.value;
        }
        return attributes;
    }

    function objectHasKeys(object) {
        for (var k in object)
            return true;
        return false;
    }


    var emptyTags = {
        area: 1,
        base: 1,
        basefont: 1,
        br: 1,
        col: 1,
        frame: 1,
        hr: 1,
        img: 1,
        input: 1,
        isindex: 1,
        link: 1,
        meta: 1,
        param: 1,
        embed: 1,
        '?xml': 1
    };

    var idSequence = 0;

    function renderNode(node, viewModel, parents, renderComponent, afterRenderCallbacks, componentElementId) {
        if (node.type === 'text')
            return node.data;

        var content = '';
        var style = { };
        var attributes = node.attributes || { };
        var dataBindAttributeValue = attributes['data-bind'];
        var hasRenderedChildNodes = false;

        if (dataBindAttributeValue) {
            var parsedBindings = ko.bindingProvider.instance.parseBindingsString(dataBindAttributeValue, { $data: viewModel, $parent: parents.length ? parents[parents.length - 1] : null, $parents: parents });

            if (parsedBindings.component) {
                var childComponent = ko.utils.unwrapObservable(parsedBindings.component);
                if (_.isArray(childComponent))
                    childComponent.forEach(function(c) {
                        content += renderComponent(c);
                    });
                else
                    content += renderComponent(childComponent);

                hasRenderedChildNodes = true;
            } else if (parsedBindings.foreach) {
                var newParents = [viewModel].concat(parents);
                parsedBindings.foreach.forEach(function(item) {
                    content += renderNodes(node.children, item, newParents, renderComponent, afterRenderCallbacks);
                });

                hasRenderedChildNodes = true;
            } else if (parsedBindings['with']) {
                var item = _.isArray(parsedBindings['with']) ? parsedBindings['with'][0] : parsedBindings['with'];
                var newParents = [viewModel].concat(parents);
                content += renderNodes(node.children, item, newParents, renderComponent, afterRenderCallbacks);

                hasRenderedChildNodes = true;
            } else if ('if' in parsedBindings) {
                var condition = ko.utils.unwrapObservable(parsedBindings['if']);

                if (condition)
                    content += renderNodes(node.children, viewModel, parents, renderComponent, afterRenderCallbacks);

                hasRenderedChildNodes = true;
            }

            var addToContent = function(s) { content += s; };
            var elementCallbacks = [];
            var addElementCallback = function(fn) { elementCallbacks.push(fn); };

            for (var bindingName in parsedBindings) {
                if (!parsedBindings.hasOwnProperty(bindingName))
                    continue;

                if (bindingName === '_ko_property_writers' || bindingName === 'component' || bindingName === 'foreach' || bindingName === 'with' || bindingName === 'if')
                    continue;

                if (!ko.bindingHandlers[bindingName] || !ko.bindingHandlers[bindingName].stringRender)
                    throw new Error('StringBasedComponentRenderer: Unknown binding ' + bindingName);

                var bindingValue = ko.utils.unwrapObservable(parsedBindings[bindingName]);
                ko.bindingHandlers[bindingName].stringRender(bindingValue, style, attributes, addToContent, addElementCallback);
            }

            if (objectHasKeys(style))
                attributes.style = styleToString(style);
            
            if (elementCallbacks.length > 0) {
                var sbcrId = ++idSequence;
                attributes['data-sbcr-id'] = sbcrId;
                elementCallbacks.forEach(function(callback) {
                    afterRenderCallbacks.push(function() {
                        var element = $('[data-sbcr-id=' + sbcrId + ']');
                        callback(element, viewModel);
                    });
                });
                
            }
        }

        if (componentElementId)
            attributes['data-cid'] = componentElementId;

        if (!hasRenderedChildNodes)
            content += renderNodes(node.children, viewModel, parents, renderComponent, afterRenderCallbacks);

        if (node.type === 'virtual')
            return content;

        return '<' + node.name + attributesToString(attributes) + '>' + (emptyTags[node.name] ? '' : content + '</' + node.name + '>');
    }

    var nativeBindings = {
        visible: function(bindingValue, style, attributes, addToContent) {
            style.display = bindingValue ? '' : 'none';
        },

        text: function(bindingValue, style, attributes, addToContent) {
            addToContent(bindingValue);
        },

        attr: function(bindingValue, style, attributes) {
            for (var key in bindingValue) {
                if (bindingValue.hasOwnProperty(key))
                    attributes[key] = ko.utils.unwrapObservable(bindingValue[key]);
            }
        },

        style: function(bindingValue, style) {
            for (var key in bindingValue) {
                if (bindingValue.hasOwnProperty(key))
                    style[key] = ko.utils.unwrapObservable(bindingValue[key]);
            }
        },

        css: function(bindingValue, style, attributes) {
            // TODO: Check if class needs to be unset
            for (var className in bindingValue) {
                if (bindingValue.hasOwnProperty(className) && ko.utils.unwrapObservable(bindingValue[className])) {
                    if (attributes['class'])
                        attributes['class'] += ' ' + className;
                    else
                        attributes['class'] = className;
                }
            }
        },
        
        click: function(bindingValue, style, attributes, addToContent, addElementCallback) {
            addElementCallback(function(element, viewModel) {
                $(element).bind('click', bindingValue.bind(viewModel, viewModel));
            });
        },
        
        event: function(bindingValue, style, attributes, addToContent, addElementCallback) {
            addElementCallback(function(element, viewModel) {
                element = $(element);
                for (var eventName in bindingValue) {
                    if (bindingValue.hasOwnProperty(eventName))
                        element.bind(eventName, bindingValue[eventName].bind(viewModel, viewModel));
                }
            });
        }
    };

    for (var bindingName in nativeBindings) {
        if (!nativeBindings.hasOwnProperty(bindingName)) continue;

        ko.bindingHandlers[bindingName].stringRender = nativeBindings[bindingName];
    }

    // Parses HTML using jQuery/DOM. The output syntax matches NodeHtmlParser, and it is only slighly
    // slower, and ~30 lines against over 900. See https://github.com/tautologistics/node-htmlparser
    // Additionally this parser recognizes Knockout virtual elements (<!-- ko... -->).
    function parseTemplate(template) {
        var dom = $(template).get();

        function parseNodes(nodes) {
            var output = [];
            var virtualNodeStack = [];

            for (var i = 0, l = nodes.length; i < l; i++) {
                var node = nodes[i];

                if (node.nodeType === 1) {
                    var parsed = {
                        type: 'tag',
                        name: node.tagName.toLowerCase(),
                        attributes: getAttributesFromNode(node)
                    };
                    if (node.childNodes.length > 0)
                        parsed.children = parseNodes(node.childNodes);

                    output.push(parsed);
                } else if (node.nodeType === 3)
                    output.push({ type: 'text', data: node.nodeValue });
                else if (node.nodeType === 8) {
                    if (node.nodeValue.match( /^\s*ko (.*)$/ )) {
                        virtualNodeStack.push({ type: 'virtual', attributes: { 'data-bind': RegExp.$1 }, outputBefore: output });
                        output = [];
                    } else if (node.nodeValue.match( /^\s*\/ko\s*$/ )) {
                        if (virtualNodeStack.length === 0)
                            throw new Error('parseTemplate: Unmatched closing tag <!--' + node.nodeValue + '-->');

                        var virtualNode = virtualNodeStack.pop();
                        virtualNode.children = output;
                        output = virtualNode.outputBefore;
                        output.push(virtualNode);
                    }
                    // We ignore comments by default                      
                } else
                    throw new Error('parseTemplate: Unknown node type ' + node.nodeType);

            }

            return output;
        }

        return parseNodes(dom);
    }

    function parseTemplateCached(template) {
        if (!parsedTemplateCache[template])
            parsedTemplateCache[template] = parseTemplate(template);

        return parsedTemplateCache[template];
    }

    var parsedTemplateCache = { };

    return Base.extend({
        constructor: function(getTemplateForComponent) {
            this.getTemplateForComponent = getTemplateForComponent;
        },

        render: function(component) {
            var me = this;
            var callbacks = [];
            var componentsById = { };

            var renderSubComponent = function(subComponent) {
                var nodes = parseTemplateCached(me.getTemplateForComponent(subComponent));
                if (!subComponent.__cid) {
                    subComponent.__cid = ++idSequence;
                    componentsById[subComponent.__cid] = subComponent;
                }

                return renderNodes(nodes, subComponent, [], renderSubComponent, callbacks, subComponent.__cid);
            };

            var parsedTemplate = parseTemplateCached(this.getTemplateForComponent(component));
            
            return {
                html: renderNodes(parsedTemplate, component, [], renderSubComponent, callbacks),
                callbacks: callbacks,
                componentsById: componentsById                
            };
        }
    });
});