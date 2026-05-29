define(function(require) {
    var core = require('framework/core');
    var template = require('template!TopPanel');
    var session = require('session');
    var config = require('config');
    var SubNavigation = require('./SubNavigation');
    var VideoModal = require('components/videoModal/VideoModal');

    var ko = core.ko;

    var TopPanel = core.Base.extend({
        template: template,

        constructor: function(oldSubNavigation) {
            TopPanel.instance = this;

            this.subNavigation = new SubNavigation(oldSubNavigation);

            this.currentPage = ko.computed(function() {
                if (!core.Application.instance)
                    return null;
                return core.Application.instance.currentPage();
            });

            this.user = session.user;

            this.userName = session.user.email;

            this.appInfo = session.appInfo;

            this.videos = [{ id: "Introduction", name: "Introduktion til Spiir", youTubeId: "Xwu-pni9vFo" }];

            this.rendered = $.Deferred();

            _.bindAll(this, 'playVideo');
        },

        close: function() {
            var me = this;
            return $.Deferred(function(d) {
                me.hideMenu(function() { d.resolve(); });
            });
        },

        showMenu: function() {
            // Method is set in afterRender
        },

        hideMenu: function() {
            // Method is set in afterRender
        },

        open: function() {
            var me = this;
            return $.Deferred(function(d) {
                me.showMenu(function() { d.resolve(); });
            });
        },

        afterRender: function(elements) {
            var startEventY = 0,
                startTime,
                startBottom,
                delta,
                isHiddenAtStart;

            elements = $(elements);

            this.rendered.resolve(elements);

            var menu = elements.find('.menu');

            var collapsedBottom = parseInt(menu.css('bottom'), 10);
            var fullHeight = menu.outerHeight();
            var expandedBottom = -fullHeight;

            var moveEvent = core.isTouchDevice ? 'touchmove' : 'mousemove';
            var startEvent = core.isTouchDevice ? 'touchstart' : 'mousedown';
            var endEvent = core.isTouchDevice ? 'touchend' : 'mouseup';

            function getEventY(event) {
                return event.originalEvent && event.originalEvent.touches && event.originalEvent.touches.length > 0
                    ? event.originalEvent.touches[0].pageY
                    : event.pageY;
            }

            function onMove(event) {
                event.preventDefault();

                var currentEventY = getEventY(event);
                delta = currentEventY - startEventY;

                menu.css({
                    bottom: Math.max(expandedBottom, Math.min(collapsedBottom, startBottom - delta))
                });
            }

            function onEnd(event) {
                event.preventDefault();

                var newBottom, speed = 'normal';
                var panelHeight = Math.abs(expandedBottom - collapsedBottom);

                if (Math.abs(delta) < 5) // click
                    newBottom = isHiddenAtStart ? expandedBottom : collapsedBottom;
                else if (Date.now() - startTime < 200) { // fast drag
                    newBottom = delta > 0 ? expandedBottom : collapsedBottom;
                    speed = 'fast';
                } else if (delta > Math.min(200, 0.75 * panelHeight)
                    || (!isHiddenAtStart && Math.abs(delta) < 0.25 * panelHeight)) { // long drag down OR short drag when expanded
                    newBottom = expandedBottom;
                    speed = 'slow';
                } else
                    newBottom = collapsedBottom;

                if (newBottom === collapsedBottom) {
                    menu.removeClass('expanded');
                    menu.find('.topBar').css({ visibility: 'visible' });
                }

                menu.animate({ bottom: newBottom }, speed, null, function() {
                    if (newBottom === expandedBottom) {
                        //menu.addClass('expanded');
                        setTimeout(function() {
                            menu.find('.topBar').css({ visibility: 'hidden' });
                        }, 300);
                    } else {
                        //menu.removeClass('expanded');
                    }
                });

                if (newBottom === expandedBottom)
                    $('.page').one('click', hideOnDocumentClick);
                else
                    $('.page').unbind('click', hideOnDocumentClick);

                $(document).unbind(moveEvent, onMove);
            }

            function hideOnDocumentClick(callback) {
                menu.find('.topBar').css({ visibility: 'visible' });
                menu.removeClass('expanded');
                menu.animate({ bottom: collapsedBottom }, 'normal', null, function() {
                    if (_.isFunction(callback))
                        callback();
                });
            }

            function show(callback) {
                menu.addClass('expanded');
                setTimeout(function() {
                    menu.find('.topBar').css({ visibility: 'hidden' });
                }, 300);
                menu.animate({ bottom: expandedBottom }, 'normal', null, callback);
            }

            function onStart(event) {
                event.preventDefault();

                startBottom = parseInt(menu.css('bottom'), 10);
                isHiddenAtStart = startBottom === collapsedBottom;
                delta = 0;
                startEventY = getEventY(event);
                startTime = Date.now();

                if (startBottom === collapsedBottom) {
                    menu.addClass('expanded');
                    fullHeight = menu.outerHeight();
                    expandedBottom = -fullHeight;
                }

                $(document).on(moveEvent, onMove)
                    .one(endEvent, onEnd);
            }

            menu.on('click', function(event) {
                // prevent document click handler above
                event.stopPropagation();
            });

            menu.find('.topBar, .handle').on(startEvent, onStart);

            menu.find('.topBar .subNavigation').on(startEvent, function(event) {
                event.stopPropagation();
            });

            this.hideMenu = hideOnDocumentClick;
            this.showMenu = show;
        },

        playVideo: function(video) {
            new VideoModal(video).open();
        },

        goToImport: function() {
            this.hideMenu();
            core.Application.instance.navigate('account-index', null, { trigger: true });
        }
    });

    return TopPanel;
});
