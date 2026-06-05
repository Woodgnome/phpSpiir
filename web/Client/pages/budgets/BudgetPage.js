define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetPage');
    var utilities = require('utilities/utilities');
    var budgetService = require('services/budgetService');
    var networkService = require('services/networkService');
    var categoryService = require('services/categoryService');
    var joyRideService = require('services/joyRideService');
    var BudgetSidebar = require('./budgetSidebar/BudgetSidebar');
    var FixedBudgetList = require('./budgetList/FixedBudgetList');
    var ConsumptionBudgetList = require('./budgetList/ConsumptionBudgetList');
    var BudgetModal = require('./budgetModal/BudgetModal');
    var BudgetResults = require('./budgetResults/BudgetResults');
    var BudgetMissingDataModal = require('./budgetStart/BudgetMissingDataModal');
    var DeleteAllBudgetsModal = require('./deleteAllBudgetsModal/DeleteAllBudgetsModal');
    var BudgetPageJoyRide = require('./BudgetPageJoyRide');
    var YearPicker = require('./yearPicker/YearPicker');
    var config = require('config');


        var ko = core.ko;
        window.ko = ko;

        var budgetTypeUrlEnum = {
            income: 'indkomst',
            consumption: 'forbrug',
            bill: 'regninger',
            result: 'resultat'
        };

        return core.Page.extend({
            title: 'Budgetter',

            navigationId: 'budget',

            template: template,

            routes: [
                { id: 'budget-index', url: '', action: 'showDefaultBudget' },
                { id: 'budget-year', url: '{budgetType:enum}/{year:int}', action: 'showYearBudget', enums: { budgetType: budgetTypeUrlEnum } }
            ],

            subNavigation: {
                defaultItem: 'consumption',
                items: [
                    { title: 'Indkomst', id: 'income', selected: false },
                    { title: 'Regninger', id: 'bill', selected: false },
                    { title: 'Forbrug', id: 'consumption', selected: false },
                    { title: 'Resultat', id: 'result', selected: false }
                ]
            },

            subNavigate: function(id) {
                this.base(id);
                this.updateState({ budgetType: id });
            },

            constructor: function() {
                var me = this;

                this.loading = ko.observable(false).extend({ throttle: 10 });
                this.joyRideClass = BudgetPageJoyRide;

                this.hasBudgets = ko.observable(null);
                this.budgetList = ko.observable();
                this.budgetSidebar = new BudgetSidebar();

                this.yearPicker = new YearPicker({
                    onYearChange: function(year) {
                        me.updateState({ year: year });
                    }
                });

                this.hasBudgets.subscribe(function(hasBudgets) {
                    if (!hasBudgets)
                        me.prepareStartModal();
                });

                this.stateDefaults = {
                    budgetType: 'consumption',
                    year: new Date().getFullYear()
                };

                this.state = {
                    budgetType: ko.observable(this.stateDefaults.budgetType),
                    year: ko.observable(this.stateDefaults.year)
                };

                this.subscribeToHubMessage('budgetsChanged', me.updateUI.bind(this));

                this.title = ko.computed(function() {
                    switch (this.state.budgetType()) {
                    case 'income':
                        return 'Mit budget for indkomst';
                    case 'bill':
                        return 'Mit budget for regninger';
                    case 'consumption':
                        return 'Mit budget for forbrug';
                    case 'result':
                        return 'Resultat for mit budget';
                    }
                }, this);

                this.base();
            },

            showDefaultBudget: function() {
                this.state.budgetType(this.stateDefaults.budgetType);
                this.state.year(this.stateDefaults.year);

                this.updateUI();
            },

            showYearBudget: function(options) {
                this.state.budgetType(options.budgetType);
                this.state.year(options.year);

                this.updateUI();
            },

            updateState: function(newState) {
                var me = this;
                var currentState = ko.toJS(this.state);

                newState = _.extend({ }, currentState, newState);

                if (_.isEqual(currentState, newState))
                    return;

                _.each(newState, function(value, key) {
                    me.state[key](value);
                });

                this.updateUrlToMatchState(newState);
                this.updateUI();
            },

            updateUrlToMatchState: function(newState) {
                this.app.navigate('budget-year', {
                    budgetType: newState.budgetType,
                    year: newState.year
                });
            },

            updateUI: function() {
                var me = this;

                var updateUIStart = Date.now();

                var year = this.state.year();

                this.budgetList(null); // Work around to prevent the old list from showing with the new one (a bug probably in the component binding)
                this.loading(true);
                this.currentSubNavigationItem(this.state.budgetType());

                var hadBudgetsBefore = this.hasBudgets();

                budgetService.getBudgetSummaryForYear(year).then(function(budgetSummary) {
                    me.loading(false);

                    core.profilingLog('BudetPage.updateUI: Fetched data in ', Date.now() - updateUIStart, 'ms');

                    var hasBudgetSummary = !!budgetSummary;

                    me.hasBudgets(hasBudgetSummary);

                    if (hasBudgetSummary) {
                        var budgetType = me.state.budgetType();
                        var budgetList = null;

                        if (budgetType === 'income' || budgetType === 'bill')
                            budgetList = new FixedBudgetList(budgetSummary[budgetType], budgetType, year);
                        else if (budgetType === 'consumption')
                            budgetList = new ConsumptionBudgetList(budgetSummary[budgetType], budgetType, year);
                        else if (budgetType === 'result')
                            budgetList = new BudgetResults(budgetSummary.result, year);

                        me.budgetList(budgetList);

                        me.budgetSidebar.changeState({ budgetType: budgetType, year: year });
                        me.yearPicker.changeState({ year: year });

                        if (!hadBudgetsBefore)
                            me.beginJoyRideIfNotSeen();

                        core.profilingLog('BudetPage.updateUI: Rendered in ', Date.now() - updateUIStart, 'ms');
                    }
                });
            },

            changeYear: function(direction) {
                var newYear = this.state.year() + direction;

                this.updateState({ year: newYear });
            },

            showStartModal: function () {
                this.userDataCheck.then(function (result) {
                    new BudgetMissingDataModal(result).open();
                });
            },

            prepareStartModal: function() {
                if (!this.userDataCheck)
                    this.userDataCheck = budgetService.checkUserDataForBudgets();
            },

            beginJoyRideIfNotSeen: function() {
                var me = this;
                if (joyRideService.hasUserSeenJoyRide('BudgetPageJoyRide'))
                    return;

                core.Application.instance.addModalTask(function(callback) {
                    _.defer(function() {
                        new me.joyRideClass(callback).begin();
                    });
                });
            },

            newBudget: function() {
                new BudgetModal({
                    operation: 'create',
                    year: this.state.year(),
                    budgetType: this.state.budgetType()
                }).open();
            },
            
            exportBudget: function () {
                utilities.openBrowserPopup(config.urls.exportBudget + '?' + $.param({ year: this.state.year() }), { name: 'excelExport', width: 1000, height: 700 });
            },
            
            showDeleteAllBudgetsModal: function () {
                new DeleteAllBudgetsModal().open();
            },

            dispose: function () {
                this.budgetSidebar.dispose();
                this.yearPicker.dispose();
                this.base();
            }
        });
    });