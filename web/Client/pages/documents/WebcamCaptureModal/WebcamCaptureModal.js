define(function(require) {
    var core = require('framework/core');
    var template = require('template!WebcamCaptureModal');
    var documentService = require('services/documentService');


    return core.Popup.extend({
        template: template,

        constructor: function() {
            var me = this;

            this.imageCaptured = ko.observable(false);
            this.processing = ko.observable(false);
            this.processing.subscribe(function(p) { this.showCloseLink(!p); }, this);

            this.base({ disposeOnClose: true });

            this.video = this.element.find('video').get(0);
            this.canvas = this.element.find('canvas').get(0);
            this.ctx = this.canvas.getContext('2d');
            this.localMediaStream = null;

            // Not showing vendor prefixes or code that works cross-browser.
            navigator.getUserMedia({ video: true }, function(stream) {
                me.video.src = window.URL.createObjectURL(stream);
                me.localMediaStream = stream;
            }, function() {
                me.close();
                console.log('getUserMedia rejected');
            });
        },

        dispose: function () {
            if (this.localMediaStream)
                this.localMediaStream.stop();
        },

        capture: function() {
            if (this.localMediaStream) {
                this.ctx.drawImage(this.video, 0, 0);
                // "image/webp" works in Chrome 18. In other browsers, this will fall back to image/png.
                this.element.find('img').attr('src', this.canvas.toDataURL('image/webp'));

                this.imageCaptured(true);
            }
        },

        reset: function() {
            this.imageCaptured(false);
        },

        addDocument: function() {
            var me = this;
            this.processing(true);

            documentService.uploadFromDataUrl(this.canvas.toDataURL('image/png'))
                .then(function() {
                    me.processing(false);
                    me.close();
                }, function(error) {
                    error.acknowledge();
                    me.processing(false);
                    alert('Bilaget kunne ikke gemmes, vi beklager!');
                });
        }
    });
});