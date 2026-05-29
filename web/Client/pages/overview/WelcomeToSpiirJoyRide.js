define(function(require) {
    var core = require('framework/core');
    var JoyRide = require('components/joyRide/JoyRide');
    var TopPanel = require('components/TopPanel');
    var config = require('config');
    var session = require('session');


    var steps = [
        {
            title: 'Velkommen!',
            content: 'Vi har lavet en lille guide, som du kan følge og få kort info om de forskellige områder af Spiir.\nVil du gennemgå Spiir med vores guide?',
            actions: [
                { label: 'Ja tak', action: 'goto(topBar)', primary: true },
                { label: 'Nej, finder selv ud af det', link: true, action: 'next' }
            ]
        },
        {
            id: 'topBar',
            element: '.topPanel .topBar',
            content: 'Hvis du ønsker hjælp eller vil se beskeder fra Spiir, så kan du gøre det fra den grønne bar i toppen.'
        },
        {
            element: '.topPanel .handle',
            content: 'Du kan hive ned i den grønne bar her.',
            after: function() {
                return TopPanel.instance.open();
            },
            fixed: true
        },
        {
            element: '.topPanel aside:first',
            content: 'Her holder Spiir dig altid opdateret med, om du har et retvisende billede af din økonomi. Hvis ikke vil du få et rødt ikon og en tekst som fortæller dig, hvad du skal gøre for at få et retvisende billede.',
            position: 'left',
            fixed: true
        },
        {
            element: '.topPanel .jr-topPanelSupport',
            content: 'Hvis du ønsker hjælp til Spiir, så kan du altid søge i vores hjælpesektion eller tage kontakt til vores support.',
            fixed: true,
            after: function() {
                TopPanel.instance.close();
            }
        },
        {
            element: '.mainNavigation .nav',
            content: 'Fra denne menu har du altid nem adgang til hovedområderne i Spiir.',
            position: 'right',
            fixed: true
        },
        {
            title: 'Poster',
            content: 'Spiir bruger posterne fra din netbank til at skabe overblik. Det er nemt at hente dem fra netbanken. Når du henter dem ind i Spiir, så kategoriseres størstedelen automatisk. Så kommer du hurtigt igang med at få styr på dine penge.\nØnsker du at tilføje din bank nu?',
            actions: [
                {
                    label: 'Ja, tilføj bank',
                    primary: true,
                    action: function () {
                        this.close();
                        core.Application.instance.navigate('account-index', { addNewBank: true }, { trigger: true });
                    }
                },
                { label: 'Nej', action: 'close' }
            ]
        }
    ];

    var ride = JoyRide.extend({
        constructor: function(onClose) {
            this.base('WelcomeToSpiirJoyRide', steps, onClose);
        }
    });

    ride.title = 'Starthjælp for Spiir';
    return ride;
});
