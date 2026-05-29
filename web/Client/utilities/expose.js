define(function() {
    var exposeMask, exposeElement;

    var spacingByStyle = {
        normal: 0,
        joyRide: 10
    };

    var opacityByStyle = {
        normal: 0.5,
        joyRide: 0.5
    };

    function expose(element, transitionSpeed, style) {
        if (!style) style = 'normal';

        if (!element) {
            if (exposeMask) {
                var exposeMaskToRemove = exposeMask;
                exposeMask = null;

                exposeMaskToRemove.fadeOut(transitionSpeed, function() {
                    exposeMaskToRemove.remove();
                    $(window).unbind('resize', positionExposeMask);
                });
            }
            return;
        }

        exposeElement = element;

        if (!exposeMask) {
            exposeMask = $('<div class="exposeMask"/><div class="exposeMask"/><div class="exposeMask"/><div class="exposeMask"/><div class="exposeCenter"/>')
                .appendTo('body');

            exposeMask.filter('.exposeMask').fadeTo(transitionSpeed, opacityByStyle[style]);
            exposeMask.filter('.exposeCenter').fadeIn();

            if (style)
                exposeMask.addClass(style);

            positionExposeMask(false, transitionSpeed, style);
        } else {
            positionExposeMask(true, transitionSpeed, style);
        }

        $(window).bind('resize', positionExposeMask);
    }

    var lastCenterPos, docWidth, docHeight;

    function positionExposeMask(animate, transitionSpeed, style) {
        // Measure size from .page, as it is helps preventing horizontal scrolling compared to measuring document
        docWidth = $('.page').width();
        docHeight = $(document).height();

        var centerPos;
        var maskCenter = exposeMask.filter('.exposeCenter');

        if (exposeElement === 'none') {
            if (lastCenterPos) {
                centerPos = {
                    left: Math.round(lastCenterPos.left + lastCenterPos.width / 2),
                    top: Math.round(lastCenterPos.top + lastCenterPos.height / 2),
                    width: 0,
                    height: 0
                };
            } else {
                centerPos = {
                    left: Math.round(docWidth / 2),
                    top: Math.round(docHeight / 2),
                    width: 0,   
                    height: 0
                };
            }
            if (maskCenter.is(':visible'))
                maskCenter.fadeOut();
        } else {
            var elPos = exposeElement.offset();

            var spacing = spacingByStyle[style];

            centerPos = {
                left: elPos.left - spacing,
                top: elPos.top - spacing,
                width: exposeElement.outerWidth() + spacing * 2,
                height: exposeElement.outerHeight() + spacing * 2
            };

            if (maskCenter.is(':hidden'))
                maskCenter.fadeIn();
        }

        if (centerPos.left < 0) {
            centerPos.width += centerPos.left;
            centerPos.left = 0;
        }
        if (centerPos.top < 0) {
            centerPos.height += centerPos.top;
            centerPos.top = 0;
        }


        if (animate)
            animateMask(lastCenterPos, centerPos, transitionSpeed);
        else
            positionMaskByCenter(centerPos);

        lastCenterPos = centerPos;
    }

    function animateMask(startCenter, endCenter, speed, easing, callback) {
        var properties = Object.keys(startCenter);

        var opt = jQuery.speed(speed, easing, callback);

        opt.step = function(now, fx) {
            var ratio = (now - fx.start) / (fx.end - fx.start);

            var newCenter = { };
            properties.forEach(function(prop) {
                newCenter[prop] = Math.round(startCenter[prop] + (endCenter[prop] - startCenter[prop]) * ratio);
            });

            positionMaskByCenter(newCenter);
        };

        opt.complete = opt.old || callback || jQuery.isFunction(easing) && easing;

        $('<div style="width: 0"/>').animate({ width: 10 }, opt);
    }

    function positionMaskByCenter(center) {
        exposeMask.eq(0).css({ top: 0, left: 0, width: docWidth, height: center.top });
        exposeMask.eq(1).css({ top: center.top, left: center.left + center.width, width: docWidth - center.left - center.width, height: center.height });
        exposeMask.eq(2).css({ top: center.top, left: 0, width: center.left, height: center.height });
        exposeMask.eq(3).css({ top: center.top + center.height, left: 0, width: docWidth, height: docHeight - center.top - center.height });
        exposeMask.eq(4).css(center);
    }

    return expose;
});