define(function(require) {
    var core = require('framework/core');
    var networkService = require('services/networkService');


    var ko = core.ko;

    var documents = ko.observable([]);

    var documentsUploading = 0;

    function addToUploadCount(count) {
        documentsUploading += count;
        documentService.trigger('uploadsChanged', { count: documentsUploading });
    }

    var documentService =  {
        uploadFromDataUrl: function (dataUrl) {
            addToUploadCount(1);
            return networkService.ajaxPost('uploadDocumentFromDataUrl', { image: dataUrl })
                .then(function() {
                    $(this).trigger('documentsChanged');
                    addToUploadCount(-1);
                }, function() {
                    addToUploadCount(-1);
                });
        },

        getDocument: function(filters) {
            return networkService.ajaxGet('getDocumentsFilter', filters);
        },

        getDocumentDataSource: function(filters) {

        },

        // TODO: Replace event handling with EventHandlerMixin after AccountPage has been merged down
        trigger: function(event, data) {
            $(this).trigger(event, data);
        },

        on: function(event, handler) {
            $(this).on(event, handler);
        },

        off: function(event, handler) {
            $(this).off(event, handler);
        }
    };

    return documentService;
});