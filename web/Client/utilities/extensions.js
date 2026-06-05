define(function(require) {
    var utilities = require('./utilities');


    /**
     * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
     * © 2011 Colin Snover <http://zetafleet.com>
     * Released under MIT license.
     */
    (function(Date, undefined) {
        var origParse = Date.parse, numericKeys = [1, 4, 5, 6, 7, 10, 11];
        Date.parse = function(date) {
            var timestamp, struct, minutesOffset = 0;

            // Spiir extension: Allow 1+ digits for second fraction, instead of only 3. Fixes problems with NewtonSoft.JSON returning
            // only 2 (or more) digits (which seemingly is perfectly fine according to ISO 8601).

            // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
            // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
            // implementations could be faster
            //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
            if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/ .exec(date))) {
                // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
                for (var i = 0, k; (k = numericKeys[i]); ++i) {
                    struct[k] = +struct[k] || 0;
                }

                // allow undefined days and months
                struct[2] = (+struct[2] || 1) - 1;
                struct[3] = +struct[3] || 1;

                if (struct[8] !== 'Z' && struct[9] !== undefined) {
                    minutesOffset = struct[10] * 60 + struct[11];

                    if (struct[9] === '+') {
                        minutesOffset = 0 - minutesOffset;
                    }
                }

                timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
            } else {
                timestamp = origParse ? origParse(date) : NaN;
            }

            return timestamp;
        };
    }(Date));

    $.extend(Date, {
        fromMonth: function(month) {
            return new Date(month.substring(0, 4), parseInt(month.substring(4, 6), 10) - 1, 1);
        },
        
        fromIsoDate: function (isoDate) {
            return new Date(isoDate);
        },
        
        format: function(format, date, capitalize) {
            /// <summary>Formats a date as a string</summary>
            /// <param name="format">
            /// Available formats:
            ///     %d: Two digit day of the month, 01 to 31 
            ///     %e: Day of the month, 1 through 31
            ///     %b: Short month, like 'Jan'
            ///     %B: Long month, like 'January'
            ///     %m: Two digit month number, 01 through 12
            ///     %y: Two digit year
            ///     %Y: Full year
            /// </param>
            /// <returns type="String">The formatted string</returns>

            // Based on http://www.php.net/manual/en/function.strftime.php
            // TODO: Replace with a formatting method compatible with .NET (see e.g. moment.js)

            function pad(number) {
                return number.toString().replace( /^([0-9])$/ , '0$1');
            }

            format = format || '%d-%m-%Y';

            var replacements = {
                // Day
                d: function(date) { return pad(date.getDate()); },
                e: function(date) { return date.getDate(); },

                // Month
                b: function(date) { return utilities.language.monthNames[date.getMonth()].substr(0, 3); },
                B: function(date) { return utilities.language.monthNames[date.getMonth()]; },
                m: function(date) { return pad(date.getMonth() + 1); },

                // Year
                y: function(date) { return date.getFullYear().toString().substr(2, 2); },
                Y: function(date) { return date.getFullYear(); },
                
                // Hour and minutes
                H: function(date) { return pad(date.getHours()); },
                i: function (date) { return pad(date.getMinutes()); }
            };

            var formatted = format.replace( /%(\w)/g , function(x, key) {
                if (!replacements[key])
                    throw new Error("Unknown date format option " + key + " in format " + format);

                return replacements[key](date);
            });

            return capitalize ? formatted.substr(0, 1).toUpperCase() + formatted.substr(1) : formatted;
        },

        today: function () {
            var now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
    });

    $.extend(Date.prototype, {
        toMonthString: function() {
            return this.format("%Y%m");
        },

        toStringWithOptionalYear: function() {
            var daysFromDate = (new Date() - this) / (3600 * 24);
            var thisYear = this.getYear() == new Date().getYear();

            if (thisYear || daysFromDate < 180)
                return this.format("%e. %B");
            return this.format("%e. %b %Y");
        },

        addMonths: function(months) {
            var startOfNewMonth = new Date(this.getFullYear(), this.getMonth() + months, 1);
            var dayOfMonth = this.getDate();
            while (true) {
                var newDate = new Date(startOfNewMonth.getFullYear(), startOfNewMonth.getMonth(), dayOfMonth);
                if (newDate.getYear() == startOfNewMonth.getYear() && newDate.getMonth() == startOfNewMonth.getMonth())
                    return newDate;

                dayOfMonth--;
            }
        },
        
        addDays: function (days) {
            var newDate = new Date(this);
            newDate.setDate(newDate.getDate() + days);
            return newDate;
        },

        getStartOfMonth: function() {
            return new Date(this.getFullYear(), this.getMonth(), 1);
        },
        
        getStartOfDay: function() {
            return new Date(this.getFullYear(), this.getMonth(), this.getDate());
        },
        
        format: function (format, capitalize) {
            return Date.format(format, this, capitalize);
        }
    });
    
    function normalizeMapIterator(original) {
        if (_.isString(original))
            return function(obj) { return obj[original]; };
        return original;
    }


    $.extend(Array.prototype, {
        remove: function(element) {
            for (var i = 0; i < this.length; i++) {
                if (this[i] === element)
                    this.splice(i, 1);
            }
        },

        find: function(iterator, context) {
            return _.find(this, iterator, context);
        },

        sortBy: function(iterator, context) {
            return _.sortBy(this, iterator, context);
        },

        groupBy: function(iterator, context) {
            return _.groupBy(this, iterator, context);
        },
        
        unique: function(isSorted, iterator) {
            return _.unique(this, isSorted, normalizeMapIterator(iterator));
        },
        
        sum: function(iterator, context) {
            if (!iterator)
                iterator = _.identity;
            iterator = normalizeMapIterator(iterator);

            return _.reduce(this, function(memo, value) {
                return memo + iterator(value);
            }, 0, context);
        },
        
        average: function(iterator, context) {
            if (!iterator)
                iterator = _.identity;

            return this.sum(normalizeMapIterator(iterator), context) / this.length;
        },
        
        min: function (iterator, context) {
            return _.min(this, normalizeMapIterator(iterator), context);
        },
        
        max: function (iterator, context) {
            return _.max(this, normalizeMapIterator(iterator), context);
        },
        
        toObject: function(keyIterator, valueIterator) {
            var object = {};
            var keySelector = normalizeMapIterator(keyIterator);
            var valueSelector = valueIterator ? normalizeMapIterator(valueIterator) : _.identity;

            this.forEach(function(o) {
                object[keySelector(o)] = valueSelector(o);
            });
            return object;
        },
        
        pluck: function(key) {
            return _.pluck(this, key);
        },
        
        first: function () {
            if (this.length == 0)
                throw new Error('Array does not contain any elements.');
            
            return _.first(this);
        },

        last: function () {
            if (this.length == 0)
                throw new Error('Array does not contain any elements.');

            return _.last(this);
        },

        firstOrDefault: function () {
            return _.first(this);
        },
        
        lastOrDefault: function () {
            return _.last(this);
        }
    });

    $.extend(String.prototype, {
        capitalize: function() {
            if (!this)
                return this;

            return this.charAt(0).toUpperCase() + this.substring(1);
        },

        camelCase: function() {
            if (!this)
                return this;

            return this.charAt(0).toLowerCase() + this.substring(1);
        }
    });

    $.extend(Number.prototype, {
        formatPrice: function() {
            return utilities.formatPrice(this);
        },

        toCategorizationPercent: function() {
            var percent = this * 100;
            var rounded = Math.round(percent);
            if (rounded == 100 && percent != 100)
                return 99;
            return rounded;
        },
        
        toZeroPaddedString: function (length) {
            var s = this.toString();
            while (s.length < length)
                s = '0' + s;
            return s;
        }
    });
});