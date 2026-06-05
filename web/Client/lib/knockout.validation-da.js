define(function(require) {
    var ko = require('lib/knockout');
    var koVal = require('lib/knockout.validation');

    ko.validation.localize({
        required: 'Skal udfyldes.',
        min: 'Angiv en værdi der mindst er {0}.',
        max: 'Angiv en værdi der højst er {0}.',
        minLength: 'Indtast mindst {0} tegn.',
        maxLength: 'Indtast højst {0} tegn.',
        pattern: 'Indtast en gyldig værdi.',
        step: 'Indtast multiplum af {0}.',
        email: 'Indtast en gyldig email-adresse.',
        date: 'Indtast en gyldig dato.',
        dateISO: 'Indtast en gyldig dato.',
        number: 'Indtast et tal.',
        digit: 'Indtast kun cifre.',
        phoneUS: 'Indtast et gyldigt telefonnummer.',
        equal: 'Indtast den samme værdi igen.',
        notEqual: 'Indtast en anden værdi.',
        unique: 'Indtast en unik værdi.'
    });
});