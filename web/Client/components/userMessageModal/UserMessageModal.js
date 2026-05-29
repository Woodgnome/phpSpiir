define(['framework/core', 'template!UserMessageModal', 'session', 'services/userService'], function (core, template, session, userService) {
    return core.Popup.extend({
        template: template,

        constructor: function (userMessages) {
            this.userMessages = userMessages;

            userMessages.forEach(function(userMessage) {
                if (!userMessage.message.match(/<.*>/)) {
                    userMessage.message = '<p>' + userMessage.message + '</p>';
                }
            });

            this.base({
                disposeOnClose: true,
                closeOnBackgroundClick: false
            });
        },

        open: function () {
            this.base();
        }
    });
});