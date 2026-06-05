define(function(require) {
    var core = require('framework/core');
    var JoyRide = require('components/joyRide/JoyRide');


    var steps = [
        {
            title: 'Nyhed!',
            content: 'Spiir kan nu synkronisere posterne fra banken helt automatisk. Dine poster, dit overblik og dit budget er altid opdateret &ndash; helt uden at røre en finger.',
            actions: [
                {
                    label: 'Tilslut din bank',
                    primary: true,
                    action: function() {
                        this.close();
                        core.Application.instance.navigate('account-index', { addNewBank: true }, { trigger: true });
                    }
                },
                { label: 'Luk', action: 'close' }
            ]
        }
    ];

    return JoyRide.extend({
        constructor: function(onClose) {
            this.base('AutoSyncJoyRide', steps, onClose);
        }
    });
});