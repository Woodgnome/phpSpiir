define(function(require) {
    var core = require('framework/core');
    var ChartTooltipBase = require('./ChartTooltipBase');



    return core.IndependentComponent.extend({
        constructor: function(options) {
            var me = this;

            this.options = _.extend({
                disableMouseEvents: false,
                position: 'left',
                disposeOnClose: true
            }, options);

            this.isVisible = false;

            this.addToDom({ hidden: true });

            if (!this.options.disableMouseEvents) {
                this.element
                    .bind('mouseenter', function() {
                        me.abortHide();
                    })
                    .bind('mouseleave', function() {
                        me.hideAfterTimeout();
                    });
            }
        },

        show: function(targetElement) {
            if (this.isVisible) {
                this.abortHide();
                return;
            }
            this.isVisible = true;

            var me = this;
            targetElement = $(targetElement);
            var targetPos = targetElement.offset();

            // Work-around to prevent incorrect position when scrolling, as the tooltip is currently
            // positioned relative to the body, and scrolling the body from a popup moves the tooltip.
            if (core.Popup.isAnyPopupVisible()) {
                $(window).one('scroll', function() {
                    me.hide();
                });
            }

            ChartTooltipBase.positionAndShowTooltip(this.getTooltipOptions(this.options.position, targetElement, targetPos));
        },

        getTooltipOptions: function(position, targetElement, targetPos) {
            if (position === 'above' || position === 'below') {
                return {
                    element: this.element,
                    component: this,
                    position: position,
                    x: targetPos.left + targetElement.outerWidth() / 2,
                    y: position === 'above' ? targetPos.top : targetPos.top + targetElement.outerHeight(),
                    spaceAbove: 20,
                    spaceBelow: 20
                };
            } else {
                return {
                    element: this.element,
                    component: this,
                    position: position,
                    x: position === 'left' ? targetPos.left : targetPos.left + targetElement.outerWidth(),
                    y: targetPos.top + targetElement.outerHeight() / 2,
                    spaceAbove: 20,
                    spaceBelow: 20
                };
            }
        },

        abortHide: function() {
            clearTimeout(this.hideTimeout);
        },

        hideAfterTimeout: function(delay) {
            this.hideTimeout = setTimeout(this.hide.bind(this, true), delay || 300);
        },

        hide: function(animate) {
            var me = this;
            this.isVisible = false;

            if (this.isDisposed) return;

            var afterHide = function() {
                if (me.options.disposeOnClose)
                    me.dispose();
            };

            if (animate)
                this.element.fadeOut('fast', afterHide);
            else {
                this.element.hide();
                afterHide();
            }
        }
    });
});