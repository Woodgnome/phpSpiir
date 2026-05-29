define(function() {
    var language = {
        monthNames: ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'],
        shortMonthNames: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
        weekdayNames: ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag']
    };

    var utilities = {
        language: language,

        summarize: function(text, length) {
            if (text.length <= length)
                return text;

            return text.substring(0, length) + '\u2026';
        },

        formatMonth: function(format, month, capitalize) {
            return Date.fromMonth(month).format(format, capitalize);
        },

        formatPrice: function(price, showDecimals) {
            var formatMoney = function(n, c, d, t) {
                var c = isNaN(c = Math.abs(c)) ? 2 : c,
                    d = d == undefined ? "," : d,
                    t = t == undefined ? "." : t,
                    s = n < 0 ? "-" : "",
                    i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "",
                    j = (j = i.length) > 3 ? j % 3 : 0;
                return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace( /(\d{3})(?=\d)/g , "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
            };

            if (price !== 0 && !price)
                return "";

            if (showDecimals)
                return formatMoney(price, 2);
            return formatMoney(price, 0);
        },

        parseQueryString: function(queryString) {
            var params = { };
            _.each(queryString.split('&'), function(part) {
                var equals = part.indexOf('=');
                if (equals == -1)
                    params[part] = 1;
                else
                    params[part.substring(0, equals)] = decodeURIComponent(part.substring(equals + 1));
            });
            return params;
        },

        setGhostText: function(input, text) {
            var defaultTexts = ['mad', 'cafe', 'legetøj', 'diesel', 'kiropraktor', 'bukser', 'diskotek', 'husleje', 'bluse', 'bøger', 'maler'];
            if (!text)
                text = 'Skriv fx ' + defaultTexts[parseInt(Math.random() * defaultTexts.length, 10)];

            input.attr('placeholder', text);
        },

        parseFloatLocalized: function(value) {
            if (_.isString(value))
                value = value.replace(',', '.');
            return parseFloat(value);
        },

        floatToLocalizedString: function(value, fractionDigits) {
            value = value || 0;

            if (typeof fractionDigits !== 'undefined')
                value = value.toFixed(fractionDigits);
            else
                value = value.toString();

            return value.replace('.', ',');
        },

        objectsAreEqual: function(a, b) {
            var allKeys = _.keys(a).concat(_.keys(b));
            var areEqual = true;

            _.each(allKeys, function(k) {
                if (b[k] !== a[k])
                    areEqual = false;
            });
            return areEqual;
        },

        createUniqueId: function() {
            var id;
            do {
                id = '__' + Math.round(Math.random() * 1e8);
            } while (document.getElementById(id));
            return id;
        },

        getCurrentMonth: function() {
            return new Date().toMonthString();
        },

        openBrowserPopup: function(url, options) {
            ///	<summary>showPopup(url, options) - Opens a popup window</summary>
            ///	<param name="url" type="String">The URL to open</param>
            ///	<param name="options" type="Object">
            ///     Options for the popup. Example: {width: 300, height: 200, name: "survey"}
            ///	</param>
            ///	<returns type="Window" />
            var defaults = {
                width: 650,
                height: 440,
                toolbar: false,
                menubar: false,
                location: false,
                name: null,
                scrollbars: true,
                center: true,
                status: false
            };

            options = $.extend({ }, defaults, options);

            // the given size applies only to the viewport, so we subtract 70px to accomodate
            // for the taskbar (Win7 ~ 40px)
            var screenHeight = screen.availHeight - 40;
            var screenWidth = screen.availWidth;

            if (options.height > screenHeight) options.height = screenHeight;

            if (options.width > screenWidth) options.width = screenWidth;

            if (options.center) {
                options.left = screenWidth / 2 - options.width / 2;
                options.top = Math.max(0, screenHeight / 2 - options.height / 2 - 40);
            }

            var optionStrings = [];
            for (var key in options) {
                var value = options[key];
                if (typeof value == 'boolean') value = value ? 1 : 0;
                if (key != "name" && key != "center") optionStrings.push(key + "=" + value);
            }

            var popup = window.open(url, options.name, optionStrings.join(','));
            if (window.focus) popup.focus();

            return popup;
        }
    };

    return utilities;
});
