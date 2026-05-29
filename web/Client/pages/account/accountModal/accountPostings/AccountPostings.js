define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountPostings');
    var postingService = require('services/postingService');
    var config = require('config');


    return core.Component.extend({
        template: template,

        constructor: function(accountGroupDto) {
            var me = this;
            this.processing = ko.processingObservable();
            this.postings = ko.observableArray();
            this.accountType = accountGroupDto.accountType;
            this.accountGroupId = accountGroupDto.id;
            this.processing(true);

            postingService.getPostings({
                includeNonConsumption: true,
                accountGroupIds: accountGroupDto.id
            }).then(function(result) {
                me.processing(false);
                me.postings(result.postings);
            });
        }
    });
});