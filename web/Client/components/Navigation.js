define(function(require) {
    var core = require('framework/core');
    var template = require('template!Navigation');
    var config = require('config');
    var session = require('session');

    return core.Base.extend({
        template: template,

        constructor: function () {
            this.primaryLinks = [
                { title: 'Overblik', className: 'overview', urlId: 'overview-index' },
                { title: 'Budget', className: 'budget', urlId: 'budget-index' }
            ];

            if (session.user.documentsEnabled) {
                this.primaryLinks.push({ title: 'Bilag', className: 'documents', urlId: 'server:Document_Index' });
            }

            this.primaryLinks.push({ title: 'Poster', className: 'posting', urlId: 'server:Posting_Index' });
            this.primaryLinks.push({ title: 'Konti', className: 'account', urlId: 'account-index' });

            this.current = ko.computed(function() {
                if (!core.Application.instance)
                    return null;

                var currentPage = core.Application.instance.currentPage();
                if (!currentPage)
                    return null;

                return currentPage.navigationId;
            }, this);
        }
    });
});