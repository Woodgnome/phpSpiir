define(function(require) {
    var Base = require('lib/Base');
    var core = require('framework/core');
    var config = require('config');
    var session = require('session');
    var utilities = require('utilities/utilities');


    var filters = {
        images: { title: "Billeder og dokumenter (*.jpg;*.png;)", extensions: "jpg,jpeg,png" },
        csv: { title: "Kontoposteringer (*.csv)", extensions: "csv" }
    };


    var Uploader = Base.extend({
        constructor: function(options) {
            var me = this;

            if (!config.urls[options.urlId])
                throw new Error('Uploader: Unknown URL with ID ' + options.urlId);

            if (!options.uploadButtonId)
                throw new Error('Uploader: Required argument uploaderButtonId missing');

            if (!filters[options.type])
                throw new Error('Uploader: Unknown file type ' + options.type);

            var containerId = null;
            if (options.container) {
                if (options.container.attr('id'))
                    containerId = options.container.attr('id');
                else {
                    containerId = utilities.createUniqueId();
                    options.container.attr('id', containerId);
                }
            }

            var uploader = new plupload.Uploader({
                container: containerId,
                runtimes: 'html5',
                browse_button: options.uploadButtonId,
                max_file_size: '10mb',
                url: config.urls[options.urlId],
                multi_selection: options.multipleFiles || false,
                filters: [
                    filters[options.type],
                    { title: "Alle filer (*.*)", extensions: "*" }
                ],
                multipart_params: _.extend({
                    userAgent: navigator.userAgent
                }, options.params)
            });

            this.uploader = uploader;

            uploader.bind('Init', function (up, params) {
                window.pluploadRuntime = params.runtime;
                me.runtime = params.runtime;
                up.settings.multipart_params.runtime = me.runtime;
            });

            // NOTE: Important to call init before adding other event handlers. Otherwise Plupload acts strangely,
            // and only starts upload on every second file added (applies at least to Plupload 1.5.4).
            uploader.init();

            uploader.bind('FilesAdded', function(up, files) {
                me.trigger('filesAdded', files);
                up.start();
            });
            uploader.bind('Error', function(up, error) {
                me.trigger('error', error);
            });
            uploader.bind('UploadProgress', function(up, file) {
                me.trigger('uploadProgress', file);
            });
            uploader.bind('FileUploaded', function(up, file, result) {
                var parsedResult;
                try {
                    if (result.response)
                        parsedResult = JSON.parse(result.response);
                } catch(e) {
                    console.warn('Uploader: Could not parse JSON result', e);
                }
                me.trigger('fileUploaded', file, parsedResult || result);
            });

            _.bindAll(this, 'refresh');

            $(window).on('resize', this.refresh);

        },

        dispose: function() {
            this.disposeEventHandlers();
            $(window).off('resize', this.refresh);
            this.uploader.destroy();
            this.uploader = null;
        },

        refresh: function() {
            this.uploader.refresh();
        }
    });

    _.extend(Uploader.prototype, core.EventHandlerMixin);

    return Uploader;
});
