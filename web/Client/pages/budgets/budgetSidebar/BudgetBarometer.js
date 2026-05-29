define(function(require) {
    var core = require('framework/core');
    var template = require('template!BudgetBarometer');


    return core.Base.extend({
        template: template,

        update: function(budgetSummary) {
            setTimeout(function() {
                this.render();
                this.barometerMarker.animate({ markerScore: budgetSummary.barometer.score }, 500, '<>');
            }.bind(this));
        },

        render: function() {
            if (this.barometerMarker)
                return;

            var container = $(this.elements).find('.barometer');

            var markerRadius = 7;
            var markerHeight = 60;
            var w = container.width();
            var sideMargin = 30;
            var r2 = w / 2 - sideMargin;
            var r1 = r2 - 50;
            var h = r2 + 20;

            var r = Raphael(container.get(0), w, h);

            r.path([['M', 0, r2],
                    ['A', r2, r2, 0, 0, 1, r2, 0],
                    ['L', r2, r2 - r1],
                    ['A', r1, r1, 0, 0, 0, r2 - r1, r2],
                    ['Z']])
                .attr({ stroke: 'none', fill: '#ff5252' })
                .transform([['t', sideMargin, 0]]);

            r.path([['M', r2, 0],
                    ['a', r2, r2, 0, 0, 1, r2, r2],
                    ['l', r1 - r2, 0],
                    ['A', r1, r1, 0, 0, 0, r2, r2 - r1],
                    ['Z']])
                .attr({ stroke: 'none', fill: '#09ab58' })
                .transform([['t', sideMargin, 0]]);

            r.customAttributes.markerScore = function(score) {
                var angle = score / 100 * 90;
                return {
                    transform: [
                        ['t', sideMargin+ r2, r2],
                        ['R', angle, sideMargin+r2, r2]
                    ]
                };
            };

            r.text(sideMargin+(r2 - r1) / 2, r2 + 10, 'GÆLD')
                .attr({ fill: '#939090', font: '10px arial' });

            r.text(sideMargin+ 2 * r2 - (r2 - r1) / 2, r2 + 10, 'OPSPARING')
                .attr({ fill: '#939090', font: '10px arial' });

            this.barometerMarker = r.path([
                    ['M', markerRadius, 0],
                    ['A', markerRadius, markerRadius, 0, 0, 1, -markerRadius, 0],
                    ['L', 0, -markerHeight],
                    ['Z']
                ])
                .attr({ fill: '#000', stroke: 'none', markerScore: 0 })
       
        }
    });
});