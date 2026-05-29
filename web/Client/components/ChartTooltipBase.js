define(function(require) {
    var core = require('framework/core');



    var lastTooltip = null;

    function hideLastTooltip() {
        if (lastTooltip && lastTooltip.element.is(':visible')) {
            if (lastTooltip.component)
                lastTooltip.component.hide();
            else
                lastTooltip.element.hide();
        }
    }
    
    function fitTopForSideTooltip(top, elementHeight) {
        var minY = $(document).scrollTop();
        var maxY = minY + $(window).height();

        // Element is higher than the window
        if (elementHeight > maxY - minY)
            return minY;

        // Element goes below window
        if (top + elementHeight > maxY)
            return maxY - elementHeight;

        // Element goes above window
        if (top < minY)
            return minY;

        return top;
    }

    // TODO: Move this to a more generic place than ChartTooltipBase, e.g. TooltipBase.

    function positionAndShowTooltip(options) {
        options = _.extend({
            component: null, // Optional - but if set, hide will be called on the component instead on the element
            element: null,
            x: null,
            y: null,
            horizontalSpacing: 20,
            spaceAbove: 0,
            spaceBelow: 0,
            position: 'above',
            autoHide: true,
            speed: 'fast'
        }, options);

        var element = options.element;

        if (!options.spaceBelow) options.spaceBelow = options.spaceAbove;

        if (options.autoHide) {
            if (lastTooltip && lastTooltip.element !== element)
                hideLastTooltip();

            lastTooltip = { element: element, component: options.component };
        }

        var elementWidth = element.outerWidth();
        var left, top;

        var offsetX = element.data('offset-x') || 0;
        var arrow = element.find('.arrow').removeClass('top bottom left right').attr('style', '').show();


        if (options.position === 'above') {
            left = options.x - elementWidth / 2 + offsetX;

            left = Math.max(left, 10);
            left = Math.min(left, $(window).width() - elementWidth - 10);

            var outerHeight = element.outerHeight();
            top = options.y - outerHeight - options.spaceAbove;


            if (top >= $(document).scrollTop()) {
                arrow.addClass('bottom');
            } else {
                arrow.addClass('top');
                top = options.y + options.spaceBelow;
            }

            arrow.css({
                left: options.x - left
            });
        } else if (options.position === 'right') {
            left = options.x + options.horizontalSpacing;
            top = fitTopForSideTooltip(options.y - element.outerHeight() / 2, element.outerHeight());
            arrow.addClass('left');
            arrow.css({ left: -15, right: 'auto', top: options.y - top });
        } else if (options.position === 'left') {
            left = options.x - elementWidth - options.horizontalSpacing;
            top = fitTopForSideTooltip(options.y - element.outerHeight() / 2, element.outerHeight());
            arrow.addClass('right');
            arrow.css({ left: 'auto', right: -17, top: options.y - top });
        } else if (options.position === 'center') {
            left = options.x - elementWidth / 2;
            top = options.y - element.outerHeight() / 2;
            arrow.hide();
        }

        var newPosition = {
            left: left,
            top: top,
            opacity: 1
        };

        if (element.is(':visible'))
            element.stop().animate(newPosition, options.speed);
        else
            element.css(newPosition).hide().fadeIn(options.speed);
    }

    $(window).on('resize', hideLastTooltip);

    $(document).on('modalpopup:open modalpopup:close', hideLastTooltip);
    core.hub.on('app:pageChanged', hideLastTooltip);

    var ChartTooltipBase = core.IndependentComponent.extend({
        constructor: function(options) {
            var me = this;

            options = _.extend({
                pinToSeries: null
            }, options);

            this.addToDom({ hidden: true });

            this.handleMouseOver = function() {
                me.abortHide();

                var updateReturnValue = me.update(this);
                if (updateReturnValue === false) {
                    me.hide();
                    return;
                }

                var chart = this.series.chart;

                var chartPos = $(chart.container).offset();

                // Work-around to prevent incorrect position when scrolling, as the tooltip is currently
                // positioned relative to the body, and scrolling the body from a popup moves the tooltip.
                $(window).one('scroll', function() {
                    me.hide();
                });

                var point = this;
                if (options.pinToSeries !== null) {
                    point = chart.series[options.pinToSeries].points[point.x];
                }

                var x = chartPos.left + chart.plotLeft,
                    y = chartPos.top + chart.plotTop;

                if (this.series.inverted) {
                    x += chart.plotWidth - point.plotY;
                    y += chart.plotHeight - point.plotX;

                    if (this.series.type === 'bar') {
                        var barH = point.graphic.height;
                        if (window.event && (window.event.pageX || window.event.clientX)) {
                            var wantedX = window.event.pageX || window.event.clientX;
                            wantedX = Math.max(Math.min(x, wantedX), x - barH);
                            x = wantedX;
                        } else {
                            x -= barH / 4;
                        }
                    }
                } else {
                    x += point.plotX;
                    y += point.plotY;
                }

                positionAndShowTooltip({ element: me.element, x: x, y: y, spaceAbove: 25 });
            };

            this.handleMouseOut = function() {
                me.hideAfterTimeout();
            };

            this.element
                .bind('mouseenter', function() {
                    me.abortHide();
                })
                .bind('mouseleave', function() {
                    me.hideAfterTimeout();
                });
        },

        update: function(point) {
            // Tip: Return false from update to prevent tooltip to being shown
            throw new Error('ChartTooltipBase: Abstract method update must be implemented');
        },

        abortHide: function() {
            clearTimeout(this.hideTimeout);
        },

        hideAfterTimeout: function() {
            this.hideTimeout = setTimeout(this.hide.bind(this, true), 300);
        },

        hide: function(animate) {
            if (this.isDisposed) return;

            if (animate)
                this.element.fadeOut('fast');
            else
                this.element.hide();
        }
    });

    ChartTooltipBase.positionAndShowTooltip = positionAndShowTooltip;

    return ChartTooltipBase;
});