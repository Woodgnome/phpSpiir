define(function(require) {
    var Base = require('lib/Base');
    var BackboneHistory = require('./BackboneHistory');


    var parameterRegExp = /\{(\*?)(\w+)(:\w+)?\}/g ;

    function reverseLookup(object, value) {
        for (var key in object) {
            if (object.hasOwnProperty(key) && object[key] === value)
                return key;
        }
        return undefined;
    }

    function normalizeUrl(url) {
        if (!url)
            url = '/';

        else if (url !== '/' && url.charAt(url.length - 1) !== '/')
            url += '/';

        return url;
    }

    function parseQueryString(queryString) {
        var params = { };
        _.each(queryString.split('&'), function(part) {
            var equals = part.indexOf('=');
            if (equals == -1)
                params[part] = 1;
            else
                params[part.substring(0, equals)] = decodeURIComponent(part.substring(equals + 1));
        });
        return params;
    }

    return Base.extend({
        constructor: function(baseUrl) {
            this.baseUrl = normalizeUrl(baseUrl || '');

            this.routes = [];
            this.routesById = { };
        },

        addRoute: function(id, url, handler, enums) {
            if (this.routesById[id])
                throw new Error('Router.addRoute: A route with ID ' + id + ' already exists');

            enums = enums || { };

            var urlRegExp = url.replace(parameterRegExp, function(wholeMatch, isWildcard, name, constraint) {
                if (constraint === ':int')
                    return '(\\d+)';

                if (constraint === ':enum') {
                    if (!enums[name])
                        throw new Error('Missing URL parameter enumartion for ' + name);

                    var allowedValues = _.values(enums[name]).join('|');
                    return '(' + allowedValues + ')';
                }

                if (isWildcard)
                    return '(.+)';

                return '([^/]+)';
            });

            urlRegExp = '^' + urlRegExp + '$';

            var parameters = (url.match(parameterRegExp) || []).map(function(p) {
                var config = p.replace( /[\*\{\}]/g , '').split(':');

                var name = config[0];
                var converter;
                if (config[1] === 'int')
                    converter = function(s) { return parseInt(s, 10); };
                else if (config[1] === 'enum')
                    converter = function(s) { return reverseLookup(enums[name], s); };
                else
                    converter = function(s) { return s; };

                return {
                    name: name,
                    converter: converter
                };
            });

            var route = { id: id, url: url, urlRegExp: new RegExp(urlRegExp, 'i'), handler: handler, parameters: parameters, enums: enums };
            this.routesById[id] = route;
            this.routes.unshift(route);
        },

        request: function(url) {
            var queryStringParameters = { };
            var questionMarkIndex = url.indexOf('?');
            if (questionMarkIndex !== -1) {
                queryStringParameters = parseQueryString(url.substring(questionMarkIndex + 1));
                url = url.substring(0, questionMarkIndex);
            }
            url = url.replace(/\/$/, '');

            for (var i = 0, l = this.routes.length; i < l; i++) {
                var route = this.routes[i];
                var match = url.match(route.urlRegExp);

                if (match) {
                    var parameterValues = match.slice(1);
                    var handlerOptions = { };
                    for (var j = 0, m = parameterValues.length; j < m; j++) {
                        var parameter = route.parameters[j];
                        handlerOptions[parameter.name] = parameter.converter(parameterValues[j]);
                    }

                    this.routes[i].handler(_.extend(queryStringParameters, handlerOptions));

                    return true;
                }
            }

            $(this).trigger('404', { url: url });
            return false;
        },

        resolve: function(id, parameterValues) {
            // returns the URL for route with ID id, with URL parameter values from parameters,
            // and the remaining parameters as query string

            var route = this.routesById[id];
            if (!route)
                throw new Error('Router.resolve: No route with ID ' + id);

            var unusedParameterValues = _.clone(parameterValues) || {};
            
            for (var key in unusedParameterValues)
                if (unusedParameterValues[key] === null || unusedParameterValues[key] === undefined)
                    delete unusedParameterValues[key];
            
            var path = route.url.replace(parameterRegExp, function(wholeMatch, isWildcard, parameterName, constraint) {
                if (!parameterValues || !(parameterName in parameterValues))
                    throw new Error('Router.resolve: Missing value for parameter ' + parameterName);

                delete unusedParameterValues[parameterName];

                if (constraint === ':enum') {
                    var enumeration = route.enums[parameterName];

                    if (!(parameterValues[parameterName] in enumeration))
                        throw new Error('Router.resolve: Unknown enum member ' + parameterValues[parameterName] + ' for parameter ' + parameterName);

                    return enumeration[parameterValues[parameterName]];
                }

                return parameterValues[parameterName];
            });

            var queryString = $.param(unusedParameterValues);

            return queryString ? path + '?' + queryString : path;
        },
        
        resolveAbsoluteUrl: function (id, parameterValues) {
            var url = this.resolve(id, parameterValues);
            if (!url)
                return this.baseUrl;
            
            if (url.charAt(0) !== '/' && !url.match(/^\w+:/))
                return this.baseUrl + url;

            return url;
        },

        getRouteById: function(id) {
            return this.routesById[id];
        },

        navigate: function(id, parameters, triggerHandler, replace) {
            // Changes the browser's URL, optionally triggering the handler for the route
            var route = this.routesById[id];
            if (!route)
                throw new Error('Router.navigate: No route with ID ' + id);

            var fullUrl = this.resolveAbsoluteUrl(id, parameters);

            if (route.handler === 'server') {
                location.assign(this.resolveAbsoluteUrl(id, parameters));
                return;
            }

            this.history.navigate(this.resolve(id, parameters), { trigger: !!triggerHandler, replace: !!replace });
        },

        on: function(event, handler) {
            $(this).on(event, handler);
        },

        off: function(event, handler) {
            $(this).off(event, handler);
        },

        start: function (options) {
            var startOptions = _.extend({ 
                pushState: true, 
                root: this.baseUrl
            }, options);

            this.history = new BackboneHistory(this, options);
            this.history.start(startOptions, options);
        },

        stop: function() {
            this.history.stop();
        },

        getCurrentUrl: function() {
            return this.history.fragment;
        }
    });
});