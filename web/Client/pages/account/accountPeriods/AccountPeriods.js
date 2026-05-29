define(function(require) {
    var core = require('framework/core');
    var template = require('template!AccountPeriods');
    var EditPeriodPopover = require('./EditPeriodPopover');
    var AccountModal = require('../accountModal/AccountModal');
    var accountService = require('services/accountService');


    var Period = core.Base.extend({
        constructor: function(periodDto, groupStart, groupEnd) {
            _.extend(this, periodDto);

            var start = this.startDate.getTime();
            var end = this.endDate.getTime();
            var groupLength = groupEnd.getTime() - groupStart.getTime();

            this.width = Math.max(0.5, (100 * (end - start) / groupLength)) + '%';
            this.left = (100 * (start - groupStart.getTime()) / groupLength) + '%';

            this.isAutomatic = periodDto.isAutomatic;

            var periodLength = end - start;

            this.ignoredIntervals = [];

            if (this.ignorePostingsBefore) {
                this.ignoredIntervals.push({ left: 0, width: (100 * (this.ignorePostingsBefore.getTime() - start) / periodLength) + '%' });
            }
            if (this.ignorePostingsAfter) {
                var afterIntervalWidth = (100 * (end - this.ignorePostingsAfter.getTime()) / periodLength);
                this.ignoredIntervals.push({ left: (100 - afterIntervalWidth) + '%', width: afterIntervalWidth + '%' });
            }
        },

        getIgnoredIntervalForAutomaticPeriod: function(automaticPeriod) {
            var startDate = [this.ignorePostingsBefore || this.startDate, automaticPeriod.startDate].max();
            var endDate = [this.ignorePostingsAfter || this.endDate, automaticPeriod.endDate].min();

            var ignoreStart = startDate.getTime();
            var ignoreEnd = endDate.getTime();

            var start = automaticPeriod.startDate.getTime();
            var automaticPeriodLength = automaticPeriod.endDate.getTime() - automaticPeriod.startDate.getTime();

            return {
                left: (ignoreStart - start) / automaticPeriodLength * 100 + '%',
                width: (ignoreEnd - ignoreStart) / automaticPeriodLength * 100 + '%'
            };
        }
    });

    return core.Component.extend({
        template: template,

        constructor: function(accountGroupDto, processing, periodChartStart, periodChartEnd) {
            this.processing = processing;
            this.accountGroupId = accountGroupDto.id;
            this.name = accountGroupDto.name;
            this.bankName = accountGroupDto.bankName;
            this.accountGroupDto = accountGroupDto;
            this.accountTypeFormatted = accountService.formatAccountType(accountGroupDto.accountType, accountGroupDto.accountSubcategoryId);

            this.periods = accountGroupDto.periods.map(function(periodDto) {
                return new Period(periodDto, periodChartStart, periodChartEnd);
            });

            // Hidden intervals of automatic periods are implicitly defined by the manual periods in the group.
            // Thus we need to manually find them and mark:
            var automaticPeriod = this.periods.find(function(p) { return p.isAutomatic; });
            if (automaticPeriod) {
                this.periods.filter(function(p) { return !p.isAutomatic; })
                    .forEach(function(p) {
                        automaticPeriod.ignoredIntervals.push(p.getIgnoredIntervalForAutomaticPeriod(automaticPeriod));
                    });
            }

            _.bindAll(this, 'editPeriod');
        },

        editPeriod: function(period, event) {
            var me = this;
            if (this.editPeriodPopover)
                this.editPeriodPopover.close();

            this.editPeriodPopover = new EditPeriodPopover(period, this, this.processing);
            this.editPeriodPopover.on('periodChanged', function() {
                me.trigger('periodChanged');
            });
            this.editPeriodPopover.show($(event.target));
        },

        dispose: function() {
            if (this.editPeriodPopover)
                this.editPeriodPopover.close();

            this.base();
        },

        showAccountModal: function() {
            new AccountModal(this.accountGroupDto).open();
        }
    });
});