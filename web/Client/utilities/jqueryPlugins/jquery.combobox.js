(function ($) {
    function delayed(fn, options) {
        options = $.extend({
            delay: 100,
            parallel: false,
            context: this,
            abortXHR: false
        }, options);

        var timers = { };
        var returnValues = { };

        function isAbortableXHR(xhr) {
            return xhr && typeof xhr.abort == 'function' && xhr.status != 4;
        }

        return function() {
            var args = Array.prototype.slice.call(arguments);
            var key = args.join('|');
            if (!options.parallel) {
                if (timers[key])
                    clearTimeout(timers[key]);
            }
            if (options.abortXHR && isAbortableXHR(returnValues[key])) {
                returnValues[key].abort();
            }

            delete returnValues[key];

            var timer = setTimeout(function() {
                returnValues[key] = fn.apply(options.context, args);
            }, options.delay);

            if (!options.parallel) {
                timers[key] = timer;
            }

            return function() {
                clearTimeout(timer);
            };
        };
    }

    var keys = {
        ENTER: 13,
        UP: 38,
        DOWN: 40,
        LEFT: 37,
        RIGHT: 39,
        ESCAPE: 27,
        LEFT_ALT: 18,
        RIGHT_ALT: 17
    };

    var CLEAR_VALUE = '__clear__';

    var keyCodesToIgnoreOnKeyup = {};
    for (var k in keys)
        keyCodesToIgnoreOnKeyup[keys[k]] = 1;


    var Autocompletion = function (source) {
        var prepare = function (items) {
            return $.map(items, function (item) {
                var ret = [];
                if (item.submenu)
                    ret = prepare(item.submenu);

                if (item.selectable)
                    ret.push(item);

                return ret;
            });
        };

        this.cache = {};

        this.source = prepare(source);
    };

    Autocompletion.prototype = {
        rank: function (s, query) {
            var index = s.indexOf(query);
            if (index == 0)
                return 3;
            if (new RegExp("(^|\\s)" + query).test(s))
                return 2;
            if (index > 0)
                return 1;
            return 0;
        },

        search: function (query) {
            query = query.toLowerCase();

            if (this.cache[query])
                return this.cache[query];

            var matches = [];

            var me = this;

            function addIfMatching(item, alias) {
                var matchAgainst = alias || item.label;
                var ranking = me.rank(matchAgainst.toLowerCase(), query);

                if (ranking == 0)
                    return false;

                matches.push({
                    value: item.value,
                    label: item.label,
                    tag: item.tag,
                    alias: alias,
                    selectable: item.selectable,
                    ranking: ranking,
                    klass: item.klass
                });

                return true;
            }

            for (var j = 0, jl = this.source.length; j < jl; j++) {
                var item = this.source[j];
                var isMatch = addIfMatching(item);

                if (!isMatch && item.aliases) {
                    for (var i = 0, il = item.aliases.length; i < il; i++) {
                        addIfMatching(item, item.aliases[i]);
                    }
                }

                if (matches.length >= 10)
                    break;
            }

            matches.sort(function (a, b) { return b.ranking - a.ranking; });

            this.cache[query] = matches;

            return matches;
        }
    };

    var Menu = function (source, options, container) {
        this.visible = false;
        this.enableClearing = options.enableClearing;
        this.clearingLabel = options.clearingLabel;
        this.scrollingEnabled = options.scrollingEnabled;

        this.setSource(source);

        this.selection = null; // will be an <a> element

        this.element = $('<ul class="comboboxMenu">').appendTo(container).hide();
        if (options.menuClass)
            this.element.addClass(options.menuClass);

        var me = this;
        this.element.bind('mousedown', function (event) {
            $(me).trigger(event.type, [me.input]);
        });
    };

    Menu.prototype = {
        setSource: function (source) {
            this.defaultHtml = this._renderMenu(source, this.enableClearing, this.clearingLabel);
            this.autocompletion = new Autocompletion(source);
        },

        _setContent: function (content) {
            var me = this;
            this.element.empty().append(content);
            this.element.find('.selected').removeClass('selected');
            this.element.find('ul').hide();
            this.selection = null;
            this.submenuShowTimeout = null;

            this.element.find('a')
                .bind('click', function (event) {
                    event.preventDefault();
                    if ($(this).data('selectable'))
                        $(me).trigger('select');
                })
                .bind('mouseenter', function (event) {
                    var link = $(this);
                    me.setSelection(link);
                    clearTimeout(me.submenuShowTimeout);
                    me.submenuShowTimeout = setTimeout(function () {
                        me.showSubmenu(link.parent());
                    }, 200);
                });
        },

        showDropdown: function (input, setSelection) {
            this._setContent(this.defaultHtml);
            this._show(input);

            if (setSelection)
                this.setSelectionToFirst();
        },

        _show: function (input) {
            this.clearSubmenuShowTimeout();

            if (this.visible && input == this.input)
                return;

            this.visible = true;
            this.input = input;

            var inputElement = input.parent().is('.comboboxWrapper') ? input.parent() : input;
            var inputPos = this.element.parent().is('body') ? inputElement.offset() : inputElement.position();

            this.element.css('position', 'absolute').show();

            var elementHeight = this.element.outerHeight();

            var top = inputPos.top + inputElement.outerHeight() - 1;
            var below = true;
            if (top + elementHeight > $(document).height()) {
                below = false;
                top = inputPos.top - elementHeight + 1;
            }

            this.element.css({
                position: 'absolute',
                left: inputPos.left,
                top: top,
                width: inputElement.innerWidth()
            });

            // This is here instead of in CSS, to fix initial incorrect initial position of the
            // menu in IE7
            this.element.find('li').css('position', 'relative');

            if (this.scrollingEnabled)
                this.element.scrollIntoView(below ? { spaceAbove: 50} : { spaceBelow: 50 });
        },

        clearSubmenuShowTimeout: function () {
            clearTimeout(this.submenuShowTimeout);
        },

        down: function () {
            this.clearSubmenuShowTimeout();

            var li;
            if (this.selection) {
                var currentLi = this.selection.parent();
                li = currentLi.next();
                if (li.length == 0)
                    li = currentLi.parent().find('>li:first');
            }
            else
                li = this.element.find('>li:first');

            this.setSelection(li.find('a:first'));
        },

        up: function () {
            this.clearSubmenuShowTimeout();

            var li;
            if (this.selection) {
                var currentLi = this.selection.parent();
                li = currentLi.prev();
                if (li.length == 0)
                    li = currentLi.parent().find('>li:last');
            }
            else
                li = this.element.find('>li:last');

            this.setSelection(li.find('a:first'));
        },

        left: function () {
            this.clearSubmenuShowTimeout();

            if (!this.selection) return;

            var li = this.selection.parent();
            var parentItem = li.parent().closest('li');
            if (parentItem.length == 0) return;

            parentItem.find('>ul').hide();
            this.setSelection(parentItem.find('a:first'));
        },

        right: function () {
            this.clearSubmenuShowTimeout();

            if (!this.selection) return;

            var li = this.selection.parent();
            var submenu = li.find('>ul');
            if (submenu.length == 0) return;

            this.showSubmenu(li);
            this.setSelection(submenu.find('a:first'));
        },

        showSubmenu: function (li) {
            li.closest('ul').find('li>ul').hide();
            var submenu = li.find('>ul');

            submenu
                .show()
                .position({
                    my: 'left top',
                    at: 'right top',
                    of: li,
                    collision: 'flip fit'
                });
        },

        getSelection: function () {
            if (!this.selection) return null;

            return {
                value: this.selection.data('value').substring(1),
                label: this.selection.data('label')
            };
        },

        setSelection: function (newSelection) {
            // TODO: treat the case when newSelection is empty
            if (this.selection)
                this.selection.removeClass('selected');

            this.selection = newSelection;
            this.selection.addClass('selected');
        },

        setSelectionToFirst: function () {
            this.setSelection(this.element.find('a:first'));
        },

        hide: function () {
            this.visible = false;
            this.element.hide();
        },

        selectionIsSelectable: function () {
            if (!this.selection) return false;

            return this.selection.data('selectable');
        },

        showSearch: function (input) {
            this._show(input);

            var matches = this.autocompletion.search(input.val());
            if (matches.length == 0) {
                this.hide();
                return;
            }

            this._setContent(this._renderMenu(matches));
            this.setSelectionToFirst();
        },

        _renderMenu: function (source, enableClearing, clearingLabel) {
            function renderMenuItem(item) {
                // TODO: Refactor this out of combobox
                var tagLabel = '';

                if (item.tag === 'fixed') {
                    tagLabel = 'Regn';
                } else if (item.tag !== 'variable') {
                    tagLabel = 'Ind';
                }

                var html = '<li>'
                   + '<a href="#" class="' + (item.klass ? item.klass : '') + (item.submenu ? ' hasSubmenu' : '')
                   + '" data-selectable="' + item.selectable
                   + '" data-value="K' + item.value
                   + '" data-label="' + item.label + '">' + item.label
                   + (item.alias ? ' (' + item.alias + ')' : '')
                   + (item.tag ? ' <span class="tag ' + item.tag + 'Tag">' + tagLabel + '</span>' : '')
                   + '</a>';

                if (item.submenu)
                    html += '<ul>' + $.map(item.submenu, renderMenuItem).join('') + '</ul>';

                html += '</li>';

                return html;
            }

            var content = $.map(source, renderMenuItem).join('');

            if (enableClearing) {
                content += renderMenuItem({ value: CLEAR_VALUE, label: clearingLabel, selectable: true, klass: '' });
            }

            return $(content);
        }
    };

    var methods = {
        init: function (options) {
            var me = this;

            options = $.extend({
                source: null,
                onSelect: function (value, label) { },
                enableClearing: false,
                clearingLabel: 'Clear selection',
                dropdownEnabled: true,
                scrollingEnabled: true,
                menuClass: null,
                propagateEnter: true,
                renderMenuInline: false,
                showOnClick: false,
                mouseOnly: false,
                blurOnSelect: false
            }, options);

            if (!options.source)
                throw new Error("combobox: source missing");

            if (this.length == 0)
                return;

            if (!this.is(':text'))
                throw new Error("must be called on a text input");

            var menuContainer = options.renderMenuInline ? this.first().parent() : $('body');

            var menu = new Menu(options.source, options, menuContainer);
            
            function toggleMenuOpenClass(input, state) {
                if (options.dropdownEnabled)
                    $(input).parent().toggleClass('menuOpen', state);
            }
            
            function hideMenu(input) {
                menu.hide();
                toggleMenuOpenClass(input, false);
            }
            
            function showMenu(input, mode) {
                if (mode === 'dropdown')
                    menu.showDropdown(input);
                else
                    menu.showSearch(input);
                toggleMenuOpenClass(input, true);
            }

            this.data('menu', menu);
            this.attr('autocomplete', 'off');
            this.data('options', options);

            function setSelectionFromMenu(input) {
                var selection = menu.getSelection();
                hideMenu(input);

                if (selection.value == CLEAR_VALUE) {
                    input.data('id', '');
                    input.val('').triggerHandler('change');
                    options.onSelect.call(input, null, '');
                } else {
                    input.data('id', selection.value);
                    input.val(selection.label).triggerHandler('change');
                    options.onSelect.call(input, selection.value, selection.label);
                }

                if (options.blurOnSelect)
                    input.blur();
            }

            var delayedSearch = delayed(function (input) {
                showMenu(input, 'search');
            });
            var cancelSearch = function () { };

            this.bind('keydown', function (event) {
                var input = $(this);
                input.data('keydown-value', input.val());

                switch (event.keyCode) {
                    case keys.ENTER:
                        if (menu.visible) {
                            if (menu.selectionIsSelectable()) {
                                setSelectionFromMenu(input);
                                if (!options.propagateEnter)
                                    event.stopImmediatePropagation();
                            } else {
                                event.stopImmediatePropagation();
                                menu.right();
                            }
                        }
                        break;

                    case keys.DOWN:
                        event.preventDefault();
                        if (options.dropdownEnabled && event.altKey && !menu.visible) {
                            showMenu(input, 'dropdown');
                            event.stopImmediatePropagation();
                        } else if (menu.visible) {
                            menu.down();
                            event.stopImmediatePropagation();
                        }
                        break;

                    case keys.LEFT:
                        if (menu.visible) {
                            event.preventDefault();
                            menu.left();
                        }
                        break;

                    case keys.RIGHT:
                        if (menu.visible) {
                            event.preventDefault();
                            menu.right();
                        }
                        break;

                    case keys.UP:
                        event.preventDefault();
                        if (event.ctrlKey)
                            break;

                        if (menu.visible) {
                            menu.up();
                            event.stopImmediatePropagation();
                        }
                        break;

                    case keys.ESCAPE:
                        event.preventDefault();
                        if (menu.visible) {
                            hideMenu(input);
                        }
                        break;

                    default:
                        if (options.mouseOnly)
                            event.preventDefault();
                        break;
                }
            }).bind('keyup', function (event) {
                var input = $(this);

                if (keyCodesToIgnoreOnKeyup[event.keyCode])
                    return;

                cancelSearch();

                var oldValue = input.data('keydown-value');
                var newValue = input.val();

                if (newValue.length == 0)
                    hideMenu(input);
                else if (oldValue != newValue)
                    cancelSearch = delayedSearch(input);

            }).bind('focus', function () {
                if (blurredFrom == this)
                    cancelHide();

                this.select();
            });

            /* Focus management */

            var delayedHide = delayed(function (input) {
                hideMenu(input);
            });
            var cancelHide = function () { };

            var blurredFrom = null;

            this.bind('blur', function (event) {
                blurredFrom = this;
                cancelHide = delayedHide($(this));
            });

            $(menu).bind('mousedown', function (event, input) {
                setTimeout(function () {
                    input.focus();
                    cancelHide();
                }, 0);
            });

            $(menu).bind('select', function () {
                setSelectionFromMenu(menu.input);
            });

            this.bind(options.showOnClick ? 'click' : 'dblclick', function (event) {
                cancelHide();
                var input = $(this);
                if (options.dropdownEnabled)
                    showMenu(input, 'dropdown');
            });

            // Combobox wrapper and button
            if (options.dropdownEnabled) {
                var wrappers = this.wrap('<span class="comboboxWrapper"></span>').parent();

                wrappers.append('<span class="comboboxButton"><span class="buttonCaret"></span></span>');

//                this.count = 0;
                var buttons = wrappers
                    .find('.comboboxButton')
                    .bind('click', function () {
//                        me.count++;
                        
//                        if (me.count == 5) {
//                            new S.UI.JoyRide("PostingsKeyboardRide", [
//                                {
//                                    element: $(this).parent(),
//                                    title: 'Keyboard FTW!',
//                                    content: 'Spiller max hvis du bruger keyboard istedet! :-)',
//                                    buttonText: 'Crazay! Tak, Spiir',
//                                    onSuccess: function () {
//                                        
//                                    }
//                                }
//                            ]);
//                        }

                        var input = $(this).parent().find('input');
                        cancelHide();
                        hideMenu(input);
                        input.focus();
                        showMenu(input, 'dropdown');
                    });

                if (this.css('display') === 'none') {
                    this.show();
                    wrappers.hide();
                }
            }
        },

        hideMenu: function () {
            var menu = this.data('menu');
            if (!menu) return;
            hideMenu(this);
        },

        showMenu: function () {
            var menu = this.data('menu');
            if (!menu) return;
            showMenu(this, 'dropdown')
        },

        setValue: function (value) {
            if (!value) {
                this.data('id', '');
                this.val('');
                return;
            }

            var options = this.data('options');
            var source = options.source;

            function findInItems(items, value) {
                for (var i = 0; i < items.length; i++) {
                    if (items[i].value === value && items[i].selectable)
                        return items[i];

                    if (items[i].submenu) {
                        var result = findInItems(items[i].submenu, value);
                        if (result)
                            return result;
                    }
                }
                return null;
            }

            var item = findInItems(source, value);
            if (!item)
                return;

            this.data('id', item.value);
            this.val(item.label);
        },

        setSource: function (source) {
            this.data('options').source = source;
            this.data('menu').setSource(source);
        }
    };

    $.fn.combobox = function (command) {
        if (methods[command])
            methods[command].apply(this, Array.prototype.slice.call(arguments, 1));
        else
            methods.init.apply(this, arguments);

        return this;
    };

})(jQuery);
