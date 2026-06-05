define(function (require) {
    var core = require('framework/core');
    var template = require('template!BankFinder');
    var accountService = require('services/accountService');
    var session = require('session');


    return core.Component.extend({
        template: template,

        constructor: function (extraClass, showTags) {
            var me = this;

            this.banks = this.registerDisposable(accountService.getBankDataSource({ owner: this }));
            this.banks.load();

            this.extraClass = extraClass;
            this.showTags = showTags || false;

            this.disabled = ko.observable(false);
            this.selectedBank = ko.observable();

            this.allCountries = this.getCountries(session.countries, this.banks());

            this.selectedCountry = ko.observable('DK');

            this.bankQuery = ko.observable('').extend({ throttle: 200 });

            this.filteredBanks = ko.computed(function () {
                var query = this.bankQuery();

                var queryRe = new RegExp(query, 'i');

                var matchingBanks = this.banks().filter(function (b) {
                    if (b.id === 'OtherBank')
                        return false;

                    if (b.countryCode !== me.selectedCountry())
                        return false;

                    if (!query)
	                    return true;

                    if (queryRe.test(b.name))
                        return true;

                    if (!b.searchHints)
                        return false;

                    for (var i = 0; i < b.searchHints.length; i++) {
                        if (queryRe.test(b.searchHints[i]))
                            return true;
                    }

                    return false;
                });

                // Make sure "other bank" is at the bottom - and always included
                var otherBank = this.banks().find(function (b) { return b.id === 'OtherBank'; });
                if (otherBank && me.selectedCountry() === 'DK')
                    matchingBanks.push(otherBank);

                var activeBanks = matchingBanks.filter(function (b) {
                    return b.active;
                });

                return activeBanks;

            }, this);
        },

        onEnter: function () {
            if (this.filteredBanks().length === 0)
                return;

            this.selectBank(this.filteredBanks()[0]);
        },

        selectBank: function (bank) {
            if (this.disabled())
                return;

            this.selectedBank(bank);
            this.trigger('selectBank', bank);
        },

        selectCountry: function(country) {
	        this.selectedCountry(country.id);
        },

        getCountries: function(allCountries, banks) {
            var countryCodesWithBanks = _.uniq(_.pluck(banks, 'countryCode'));

            var countries = [];
            
            allCountries.forEach(function(c) {
                var hasBanks = countryCodesWithBanks.some(function(x) {
                    return x === c.id;
                });

                if (hasBanks) {
                    countries.push(c);
                }
            });

            countries.sort(function (a, b) {
                return a.name.localeCompare(b.name, 'da-DK');
            });

            return countries;
        }
    });
});