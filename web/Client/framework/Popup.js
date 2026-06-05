define(function(require) {
    var IndependentComponent = require('./IndependentComponent');
    var ko = require('lib/knockout');


    var getScrollBarWidth = _.memoize(function() {
        var div = $('<div style="height: 100px; width: 100px; overflow: scroll; position: absolute; top: -200px;"></div>').appendTo('body');
        var width = div[0].offsetWidth - div[0].clientWidth;
        div.remove();

        return width || 0;
    });

    var isTouchDevice = /Mobile|Android|Windows Phone/.test(navigator.userAgent);

    return IndependentComponent.extend({
        constructor: function(options) {
            _.bindAll(this, '_closeOnEscape', '_closeOnBackgroundClick', 'positionModal');

            options = $.extend({
                showCloseLink: true,
                closeOnBackgroundClick: true,
                closeOnEscape: true,
                disposeOnClose: false
            }, options);

            // A custom implementation of showCloseLink can be defined in sub-classes. Otherwise, it is a normal true/false observable.
            if (!ko.isObservable(this.showCloseLink))
                this.showCloseLink = ko.observable(options.showCloseLink);

            this.closeOnBackgroundClick = ko.observable(options.closeOnBackgroundClick);
            this.closeOnEscape = ko.observable(options.closeOnEscape);

            this._modalOptions = options;
            this.createElement();
            this._createCloseLink();

            this.applyBindings();
        },

        dispose: function() {
            this.base();

            this.container.remove();
            this.background = null;
            this.container = null;
        },

        open: function() {
            $(document).bind('keydown', this._closeOnEscape);
            $(window).bind('resize', this.positionModal);

            if (isTouchDevice) {
                this.background.css('height', $(document).height());
                $('html,body').animate({ scrollTop: 0 }, 'fast');
            } else {
                $('body').addClass('modalPreventScroll').css('margin-right', getScrollBarWidth());
            }

            this.container.show();
            this.positionModal();

            this.background.show();

            $(document).triggerHandler('modalpopup:open');
            $(this).triggerHandler('modalpopup:open');
        },

        close: function() {
            this._close();
        },

        _close: function() {
            this.container.hide();

            if (!isTouchDevice)
                $('body').removeClass('modalPreventScroll').css('margin-right', 0);

            $(document).unbind('keydown', this._closeOnEscape);

            $(window).unbind('resize', this.positionModal);

            $(document).triggerHandler('modalpopup:close');
            $(this).triggerHandler('modalpopup:close');

            if (this._modalOptions.disposeOnClose)
                this.dispose();
        },

        bind: function(eventName, handler) {
            $(this).bind('modalpopup:' + eventName, handler);
        },

        createElement: function() {
            var container = $('<div class="modalContainer"><iframe class="background"></iframe><div class="background"></div><div class="scroller"></div></div>');

            container
                .toggleClass('scrollingModalContainer', !isTouchDevice)
                .toggleClass('tabletModalContainer', isTouchDevice);

            var mask = container.find('div.background');
            var scroller = container.find('.scroller');

            scroller.bind('click', this._closeOnBackgroundClick);

            this.background = mask;
            this.base(scroller);

            container.appendTo('body');
            this.container = container;
        },

        _createCloseLink: function() {
            var me = this;

            var link = $('<a href="#" class="closeModal"></a>').appendTo(this.element)
                .toggle(this.showCloseLink())
                .bind('click', function(event) {
                    event.preventDefault();
                    me.close();
                });

            this.showCloseLink.subscribe(function(state) {
                link.toggle(state);
            });
        },
        
        _closeOnBackgroundClick: function (event) {
            if (!this.showCloseLink() || !this.closeOnBackgroundClick())
                return;

            if (!$(event.target).is('.scroller'))
                return;

            this.close();
        },

        _closeOnEscape: function (event) {
            if (event.keyCode == 27 && this.showCloseLink() && this.closeOnEscape()) {
                this.close();
                return false;
            }
        },

        positionModal: function() {
            var windowHeight = $(window).height();
            var modalHeight = this.element.outerHeight();

            var top = modalHeight < windowHeight
                ? Math.min(windowHeight * 0.15, windowHeight / 2 - modalHeight / 2)
                : windowHeight * 0.05;

            this.element.css({
                marginTop: top,
                left: '50%',
                marginLeft: -this.element.outerWidth() / 2
            });
        }
    }, {
        isAnyPopupVisible: function() {
            return $('.modalContainer:visible').length > 0;
        }
    });
});
