define(function(require) {
    var core = require('framework/core');
    var JoyRide = require('components/joyRide/JoyRide');


    var steps = [
        {
            element: '.topPanel .subNavigation',
            title: 'Overblik over dit budget',
            content: 'Dit budget består af fire simple dele i Spiir. Det er delt op i Indkomst, regninger, forbrug og resultat. Resultatet er det du får, når du har trukket både regninger og forbrug fra din indkomst.',
            fixed: true
        },
        {
            element: '.subNavigation li:eq(0) a',
            title: 'Indkomst',
            content: 'Her kan du sætte alle de indtægter du måtte have op. Spiir genkender de fleste selv fra dine poster. Men hvis der kommer nye til fremadrettet så tilføjer du dem bare selv.',
            before: function() {
                $('.subNavigation li:eq(0) a').click();
            }
        },
        {
            element: '.subNavigation li:eq(1) a',
            title: 'Regninger',
            content: 'Her kan du sætte alle dine regninger op. Regninger er alle de udgifter, som kommer med et fast mønster, fx husleje, tv, licens, forsikringer osv. Regninger er dine faste udgifter.',
            before: function() {
                $('.subNavigation li:eq(1) a').click();
            }
        },
        {
            element: '.subNavigation li:eq(2) a',
            title: 'Forbrug',
            content: 'Her sætter du budgetter op for dit forbrug. Forbrug er alle de udgifter, som ikke følger et fast mønster fx dagligvareindkøb, tøj, cafebesøg osv. Forbrug er dine variable udgifter.',
            before: function() {
                $('.subNavigation li:eq(2) a').click();
            }
        },
        {
            element: '.consumptionLimitRow',
            title: 'Forbrugsloft',
            content: 'I Spiir sætter du et forbrugsloft, som er det du maksimalt ønsker at bruge på forbrug hver måned. Dette beløb kan være lavere og højere end dit rådighedsbeløb (som er det du har tilbage, når du har taget dine indtægter og trukket alle regninger fra).'
        },
        {
            element: '.consumptionRow:not(.consumptionLimitRow)',
            content: 'Du kan også lave et budget på fx dagligvarer, så holder Spiir øje med dit forbrug på netop den kategori. Det er super smart og betyder, at du slipper for at gemme kvitteringer og tælle sammen for at holde styr på den slags forbrug.'
        },
        {
            element: '.subNavigation li:eq(3) a',
            title: 'Resultat',
            content: 'Resultat er det du har tilbage når alle dine udgifter er trukket fra din indkomst. Hvis du lægger resultatet sammen måned for måned så kan du nemt se, hvor meget gæld eller hvor stor opsparing, der er på dit budget. Det kalder vi for din budgetsaldo, og den viser dig på et ethvert tidspunkt, hvor meget dit budget er i plus eller minus samlet set for indeværende år.',
            before: function() {
                $('.subNavigation li:eq(3) a').click();
            }
        },
        {
            element: '.budgetSidebar section:first',
            title: 'Holder budgettet?',
            content: 'Barometeret giver dig lynhurtigt en forståelse af, om du med din nuværende adfærd opbygger gæld eller sparer op. Du får en prognose, som viser dig, hvordan årets resultat vil se ud, hvis din nuværende økonomiske adfærd fortsætter resten af året.'
        },
        {
            element: '.budgetSidebar section:eq(1)',
            title: 'Nøgletal?',
            content: 'Her kan du se dine nøgletal opgjort på månedsbasis. Det giver dig et hurtigt og sundt overblik over, hvordan din økonomi er skruet sammen, og om du lever over evne eller sparer op. Her kan du også se det klassiske rådighedsbeløb, som du har når alle regninger er betalt.'
        },
    ];

    var ride = JoyRide.extend({
        constructor: function(onClose) {
            this.base('BudgetPageJoyRide', steps, onClose);
        }
    });

    ride.title = 'Starthjælp for budget';
    return ride;
});