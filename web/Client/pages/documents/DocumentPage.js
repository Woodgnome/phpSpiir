define(function(require) {
    var core = require('framework/core');
    var template = require('template!DocumentPage');
    var WebcamCaptureModal = require('./WebcamCaptureModal/WebcamCaptureModal');
    var PasteImageHandler = require('./PasteImageHandler');
    var documentService = require('services/documentService');


    var ko = core.ko;
    // TODO: Move to more global location
    window.URL = window.URL || window.webkitURL;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    return core.StatePage.extend({
        title: 'Bilag',

        navigationId: 'documents',

        template: template,

        routes: [
            { id: 'document-index', url: '', action: 'index' }
        ],

        constructor: function() {
            var me = this;
            this.getStateObject = function() {
                return {};
            };

            this.base();

            this.pasteImageHandler = new PasteImageHandler({
                callback: function(event) {
                    documentService.uploadFromDataUrl(event.dataURL);
                }
            });

            this.uploadCount = ko.observable(0);

            _.bindAll(this, 'onUploadsChanged');

            // TODO: Dispose event handlers easy after merge with AccountPage)
            documentService.on('uploadsChanged', this.onUploadsChanged);

            this.hasDocuments = ko.observable(false);
            this.loading = ko.observable(false);
            this.showCaptureWithWebcam = Boolean(navigator.getUserMedia);
        },

        dispose: function() {
            this.pasteImageHandler.dispose();
            documentService.off('uploadsChanged', this.onUploadsChanged);
            this.base();
        },

        captureWithWebcam: function() {
            new WebcamCaptureModal().open();
        },

        onUploadsChanged: function(event, data) {
            this.hasDocuments(true);
            this.uploadCount(data.count);
        },

        updateUI: function() {

        }
    });
});