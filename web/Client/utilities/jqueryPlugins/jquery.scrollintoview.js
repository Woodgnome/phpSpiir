$.fn.scrollIntoView = function(options) {
    options = $.extend({
            spaceBelow: 0,
            spaceAbove: 0,
            speed: 0,
            viewPort: window
        }, options);

    var viewPort = $(options.viewPort);
    var scrollTop = viewPort.scrollTop();
    var element = this;
    var elementTop;

    if (options.viewPort === window) {
        elementTop = element.offset().top;
    } else {
        viewPort.css('position', 'relative');
        elementTop = scrollTop + element.position().top;
    }

    var newScrollTop = 0;

    var elementHeight = element.outerHeight() + options.spaceBelow;
    var viewportHeight = viewPort.height();

    if (elementTop - options.spaceAbove < scrollTop)
        newScrollTop = elementTop - options.spaceAbove;
    else if (scrollTop + viewportHeight < elementTop + elementHeight)
        newScrollTop = elementTop + elementHeight - viewportHeight;
    else
        return this;

    newScrollTop = Math.max(0, newScrollTop);

    var elementToScroll = options.viewPort === window ? $('html,body') : viewPort;

    if (options.speed == 0)
        elementToScroll.scrollTop(newScrollTop);
    else
        elementToScroll.stop().animate({ scrollTop: newScrollTop }, options.speed);

    return this;
};