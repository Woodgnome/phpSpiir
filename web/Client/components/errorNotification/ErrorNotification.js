define(function(require) {
    var core = require('framework/core');
    var template = require('template!ErrorNotification');

    return core.Base.extend({
        template: template,

        constructor: function(error) {
            this.message = error && error.httpStatus === 0
                ? "Det ser ud som om dit internet er røget. Tjek om du er på nettet og prøv igen når du er."
                : "Øv... der er sket en fejl på serveren.";
        },

        reload: function() {
            location.reload();
        }
    });
});