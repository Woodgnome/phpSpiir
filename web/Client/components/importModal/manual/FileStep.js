define(function(require) {
    var core = require('framework/core');
    var template = require('template!FileStep');
    var UploadStepBase = require('../shared/UploadStepBase');
    var utilities = require('utilities/utilities');
    var Uploader = require('components/Uploader');
    var FileView = require('./FileView');
    var accountService = require('services/accountService');

        var ko = core.ko;

        return UploadStepBase.extend({
            template: template,

            showActions: false,

            constructor: function () {
                var me = this;

                this.base.apply(this, arguments);

                this.assertInWizardState('bank');
                
                this.bank = this.wizardState.bank;
                this.uploadButtonId = utilities.createUniqueId();
                this.files = ko.observableArray();
                this.uploadButtonText = 'Vælg filer...';
                this.uploadButtonTooltip = ko.observable();
                this.hasExistingManualAccounts = ko.observable(false);
                this.completingStep = ko.processingObservable();
                this.currency = ko.observable('DKK');

                this.showSaveButton = ko.computed(function() {
                    return this.files().length > 0;
                }, this);

                this.highlightCount = ko.computed(function() {
                    return this.files().sum(function(fileView) { return fileView.highlight() ? 1 : 0; });
                }, this);

                this.highlightCount.subscribe(function(highlightCount) {
                    if (highlightCount > 0)
                        this.wizardState.closeDisabled(true);
                }, this);

                this.saveButtonText = ko.computed(function() {
                    return this.files().some(function(f) { return f.accountIsNew(); }) ? 'Gem opsætning' : 'Videre';
                }, this);

                _.bindAll(this, 'onUploaderUploaded', 'onUploaderError');

                this.currency.subscribe(function() {
                    if (me.uploader && me.uploader.uploader && me.uploader.uploader.settings && me.uploader.uploader.settings.multipart_params) {
                        me.uploader.uploader.settings.multipart_params.currency = me.currency();
                    }
                });
            },

            beforeShowing: function() {
                var me = this;

                var promise = accountService.getAccountGroups().then(function(accountGroups) {
                    me.hasExistingManualAccounts(accountGroups.filter(function(ag) { return !ag.isAutomatic; }).length > 0);
                });

                return $.when(promise);
            },

            afterShowing: function() {
                var me = this;

                _.defer(function() {
                    me.uploader = new Uploader({
                        uploadButtonId: me.uploadButtonId,
                        container: $(me.elements).closest('.importModal'),
                        urlId: 'uploadPostings',
                        type: 'csv',
                        multipleFiles: true,
                        params: {
                            bankId: me.bank.id,
                            currency: me.currency()
                        }
                    });

                    me.uploader.on('filesAdded', function(filesAdded) {
                        if (me.files().length === 0) {
                            if (filesAdded.length === 1)
                                me.uploadButtonTooltip('Brug Ctrl eller Shift når du vælger filer, så kan du indlæse flere på en gang.');
                        } else if (filesAdded.length > 1) {
                            me.uploadButtonTooltip(null);
                        }

                        filesAdded.forEach(function(file) {
                            me.processing(true);
                            var fileView = new FileView(file, me.hasExistingManualAccounts());
                            fileView.on('resize', function () { me.uploader.refresh(); });
                            me.files.push(fileView);
                        });
                    });

                    me.uploader.on('fileUploaded', me.onUploaderUploaded);
                    me.uploader.on('error', me.onUploaderError);

                    me.registerDisposable(me.uploader);

                    me.registerDisposable(me.processing.subscribe(function() {
                        me.uploader.refresh();
                    }));
                });
            },

            onUploaderUploaded: function(file, result) {
                if (result.success)
                    core.hub.post('postingsImported');

                if (result.accountSelectionResult) {
                    var removedFiles = this.files.remove(function(fv) {
                        return _.contains(result.accountSelectionResult.deletedAccountIds, fv.accountId);
                    });
                    removedFiles.forEach(function (fv) { fv.dispose(); });
                }

                var fileView = this.files().find(function(fv) { return fv.fileId === file.id; });
                fileView.markUploaded(file, result);
                this.addUploadToTotals(result);
                this.processing(false);
            },

            onUploaderError: function(error) {
                if (error.file) {
                    var fileView = this.files().find(function(fv) { return fv.fileId === error.file.id; });

                    fileView.markFailed(error.file, error);
                } else {
                    console.warning('TODO handle generic error', error);
                    alert("Fejl ved upload: " + error.code + " " + error.message);
                }
                this.processing(false);
            },

            complete: function(callback, abort) {
                var me = this;

                if (!this.files().every(function(fileView) { return fileView.isConfigured(); })) {
                    alert('Indstil venligst alle nye konti.');
                    abort();
                    return;
                }

                this.completingStep.start();
                this.wizardState.closeDisabled(false);

                var actions = this.files()
                    .map(function(fileView) { return fileView.getSaveAction(); })
                    .filter(function(action) { return action !== null; });

                accountService.configureUploaderAccounts(actions)
                    .then(this.completingStep.stop, this.completingStep.stop)
                    .then(function () {
                        me.goToNextStep(callback);
                    }, function(error) {
                        error.acknowledge();
                        alert('Der opstod en fejl når Spiir prøvede at gemme dine konti. Prøv at indstille dem manuelt, eller kontakt support.');
                        callback();
                    });
            },

            dispose: function() {
                this.files().forEach(function(f) {
                    f.dispose();
                });
                this.base();
            }
        });
    });