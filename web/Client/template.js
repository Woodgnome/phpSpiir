define(function() {
    return {
        load: function(templateName, req, load, config) {
            req(['lib/text!' + templateName], function (template) {
                load({ name: templateName, content: template });
            });
        },

        normalize: function(name) {
            return './' + name + '.html';
        }
    };
});
