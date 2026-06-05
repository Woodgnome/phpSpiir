define(function(require) {
    var core = require('framework/core');
    var template = require('template!VideoModal');


    return core.Popup.extend({
        template: template,

        constructor: function(video) {
            this.name = video.name;
            this.youTubeId = video.youTubeId;

            this.youTubeUrl = 'https://www.youtube.com/embed/' + this.youTubeId + '?rel=0&autoplay=1';

            this.base({ disposeOnClose: true });
        }
    });
});