define(function (require) {
    var core = require('framework/core');
    var template = require('template!ConsentModal');
    var when = require('lib/when');


    var ConsentModal = core.Popup.extend({
        template: template,

        constructor: function (options) {
            _.bindAll(this, 'accept');
            _.bindAll(this, 'reject');

            this.options = options;

            this.consent = ko.observable(options.consent);
            this.processing = ko.processingObservable();

            this.base({ disposeOnClose: false, showCloseLink: false });
        },

        accept: function () {
            var me = this;

            me.processing(true);

            me.options.onAccept({ userConsentId: this.consent().userConsentId }).then(function () {
                me.close();
                me.trigger('action', true);
                me.dispose();
            }).always(function() {
                me.processing(false);
            });
        },

        reject: function () {
            var me = this;

            me.processing(true);

            me.options.onReject({ userConsentId: this.consent().userConsentId }).then(function () {
                me.close();
                me.trigger('action', false);
                me.dispose();
            }).always(function () {
                me.processing(false);
            });
        }
    });

    return {
        show: function (options) {
            var modal = new ConsentModal(options);
            modal.open();

            var deferred = when.defer();

            modal.on('action', function (actionValue) {
                deferred.resolve(actionValue);
            });

            return deferred.promise;
        }
    };
});