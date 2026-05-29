define(function(require) {
    var core = require('framework/core');


    // Based on jquery.paste_image_reader.js (MIT License, by STRd6)

    return core.Base.extend({
        constructor: function(options) {
            this.options = _.extend({}, {
                callback: function() {
                    throw new Error('PasteImageHandler: callback must be defined');
                },
                matchType: /image.*/
            }, options);

            _.bindAll(this, 'pasteEventHandler');

            return $('html').bind('paste', this.pasteEventHandler);
        },

        dispose: function() {
            $('html').unbind('paste', this.pasteEventHandler);
        },

        pasteEventHandler: function(event) {
            var me = this;
            var clipboardData, found;
            found = false;
            clipboardData = event.originalEvent.clipboardData;
            return Array.prototype.forEach.call(clipboardData.types, function(type, i) {
                var file, reader;
                if (found) {
                    return;
                }
                if (type.match(me.options.matchType) || clipboardData.items[i].type.match(me.options.matchType)) {
                    file = clipboardData.items[i].getAsFile();
                    reader = new FileReader();
                    reader.onload = function(evt) {
                        return me.options.callback({
                            dataURL: evt.target.result,
                            event: evt,
                            file: file,
                            name: file.name
                        });
                    };
                    reader.readAsDataURL(file);
                    return found = true;
                }
            });
        }
    });
});