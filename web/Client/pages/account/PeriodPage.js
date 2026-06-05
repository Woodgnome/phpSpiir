define(function(require) {
    var core = require('framework/core');
    var template = require('template!PeriodPage');
    var accountService = require('services/accountService');
    var ImportModal = require('components/importModal/ImportModal');
    var AccountList = require('./accountList/AccountList');
    var AccountSidebar = require('./accountSidebar/AccountSidebar');
    var session = require('session');
    var AccountPeriods = require('./accountPeriods/AccountPeriods');


        var ko = core.ko;

        var accountTypeOrder = {
            Consumption: 0,
            Loan: 1,
            Savings: 2
        };

        return core.Page.extend({
            template: template,

            title: 'Perioder',

            navigationId: 'posting',

            routes: [
                { id: 'period-index', url: '', action: 'index' }
            ],

            subNavigation: {
                items: [
                    { title: 'Poster', routeId: 'server:Posting_Index' },
                    { title: 'Konti', routeId: 'account-index' }
                ],
                defaultItem: 'account-index'
            },

            constructor: function() {
                var me = this;
                this.processing = ko.processingObservable();
                this.accountGroups = this.registerDisposable(accountService.getAccountGroupsDataSource({ owner: this, autoLoad: true }));

                this.chartRange = ko.computed(function() {
                    var accountGroups = this.accountGroups();

                    var minDate = accountGroups.length > 0 ? accountGroups.pluck('startDate').min() : new Date();
                    var maxDate = accountGroups.length > 0 ? accountGroups.pluck('endDate').max() : new Date();

                    return {
                        start: new Date(minDate.getFullYear(), 0, 1),
                        end: new Date(maxDate.getFullYear() + 1, 0, 1)
                    };
                }, this);

                this.accountPeriods = ko.computed(function() {
                    var accountGroups = this.accountGroups(),
                        range = this.chartRange();

                    accountGroups = accountGroups
                        .sortBy(function(ag) { return accountTypeOrder[ag.accountType]; })
                        .sortBy(function(ag) { return -ag.endDate.getTime(); });

                    return accountGroups.map(function(ag) {
                        return new AccountPeriods(ag, me.processing, range.start, range.end);
                    });
                }, this);

                this.xAxisLabels = ko.computed(function() {
                    var range = this.chartRange();
                    var labels = [];

                    var rangeLength = range.end.getTime() - range.start.getTime();

                    for (var year = range.start.getFullYear(); year < range.end.getFullYear(); year++) {
                        labels.push({
                            left: (100 * (new Date(year, 0, 1).getTime() - range.start.getTime()) / rangeLength) + '%',
                            text: year,
                            right: '',
                            major: true
                        });

                        for (var month = 4; month <= 8; month += 4)
                            labels.push({
                                left: (100 * (new Date(year, month, 1).getTime() - range.start.getTime()) / rangeLength) + '%',
                                right: '',
                                text: '',
                                major: false
                            });
                    }

                    labels.push({
                        left: '',
                        right: '0px',
                        text: range.end.getFullYear(),
                        major: true
                    });

                    return labels;
                }, this);

                this.base();
            }
        });
    });