define(function(require) {
    var config = require('config');


    var authenticationAdapter = {
        // Authentication in the web app is handled with cookies, which happens automatically from the viewpoint of the JS part
        configureRequest: function(ajaxOptions) {
        },

        handle401: function() {
            alert('Øv... der er sket en fejl på serveren.\nDu bliver nødt til at logge på igen.');
            location.reload();
        }
    };

    var apiBaseUrl = config.apiBaseUrl || '';

    function getApiUrl(urlId) {
        var path = config.urls[urlId];
        if (!path)
            throw 'NetworkService: URL with ID ' + urlId + ' not found in URL config';

        return apiBaseUrl + path;
    }

    function ajaxRequest(method, urlId, data, options) {
        options = $.extend({
            postAsJson: true,
            enableCache: false
        }, options);

        var url = getApiUrl(urlId);

        if (method === 'GET' && !options.enableCache)
            url += (url.indexOf('?') >= 0 ? '&' : '?') + "_t=" + new Date().getTime();

        var ajaxOptions = {
            url: url,
            data: data,
            type: method,
            traditional: true,
            dataType: 'json'
        };

        authenticationAdapter.configureRequest(ajaxOptions);

        if (method === 'POST' && options.postAsJson) {
            ajaxOptions.contentType = 'application/json; charset=utf-8';
            ajaxOptions.data = JSON.stringify(ajaxOptions.data);
        }

        return $.ajax(ajaxOptions)
            .fail(function(xhr) {
                if (xhr.status === 401) {
                    authenticationAdapter.handle401();
                }
            }).then(
                function(result) {
                    return result;
                },
                function (xhr) {
                    var error = parseError(xhr.responseText);
                    var errorDescription = getErrorDescription(error);

                    console.log('NetworkService error ' + xhr.status + ': ' + errorDescription, error);

                    var deferredError = new DeferredError(error.type, error.title || error.message, error.data, xhr.status);

                    // Default error handler - only used if no one else acknowledged the error
                    setTimeout(function() {
                        if (!deferredError.acknowledged) {
                            deferredError.acknowledge();
                            $(networkService).trigger('error', deferredError);
                        }
                    }, 1);

                    return deferredError;
                }
            );

    }

    function parseError(responseText) {
        var response;
        try {
            response = JSON.parse(responseText);
        } catch(e) {
            response = { error: { type: 'UnknownError' } };
        }

        return response.error || response || {};
    }

    function getErrorDescription(error) {
        return error.type + ", message=" + error.message;
    }

    function DeferredError(type, message, data, httpStatus) {
        this.type = type;
        this.message = message;
        this.acknowledged = false;
        this.data = data;
        this.httpStatus = httpStatus;
    }

    DeferredError.prototype = {
        acknowledge: function() {
            this.acknowledged = true;
        },

        toString: function() {
            return '[' + this.type + '] ' + this.message;
        }
    };

//    function logError(description, method, url, data, xhr) {
//        var message = [
//            "NetworkService: AJAX request failed (status " + xhr.status + ")",
//            method + " to " + url,
//            "description: " + description,
//            "data: " + JSON.stringify(data).substring(0, 100)
//        ].join('\n');

//        $.post(UrlConfig.logClientError, { message: message });
//    }

    var networkService = {
        ajaxPost: function(urlId, data, options) {
            return ajaxRequest('POST', urlId, data, options);
        },

        ajaxGet: function(urlId, data, options) {
            return ajaxRequest('GET', urlId, data, options);
        },

        on: function(event, handler) {
            $(this).on(event, handler);
        },

        off: function (event, handler) {
            $(this).off(event, handler);
        },

        setAuthenticationAdapter: function(adapter) {
            authenticationAdapter = adapter;
        },

        getUrl: getApiUrl
    };

    return networkService;
});
