define(function(require) {
    var utilities = require('./utilities');


    var chartUtils={
        wrapText: function(text) {
            if(text.length<20)
                return text;

            var words=text.split(/\s+/);
            if(words.length==1)
                return words[0];

            var lastWord=words.pop();
            return words.join(' ')+'<br>'+lastWord;
        },

        setupTooltip: function(elements) {
            elements.tooltip({
                layout: '<div><span class="arrow"/></div>',
                position: 'top center',
                offset: [0,-20]
            });
        },

        incomeColor: '#09ab58',
        expenseColor: '#ff9800',
        savingColor: '#e17db1',
        predictedExpenseColor: '#ffa778',
        predictedIncomeColor: '#a6c980',
        predictedSavingColor: '#ebb0cf',
        fixedExpenseColor: '#ff9800', //'#2685b6'
        comparisonColor: '#1a81ff'
    };

    Highcharts.setOptions({
        chart: {
            margin: [0,20,20,60],
            style: {
                fontFamily: 'MuseoSans, sans-serif'
            }
        },
        lang: {
            decimalPoint: ',',
            thousandsSep: '.',
            resetZoom: 'Nulstil zoom'
        },
        colors: [chartUtils.expenseColor,chartUtils.comparisonColor,chartUtils.incomeColor],
        title: {
            text: null
        },
        plotOptions: {
            series: {
                animation: false,
                cursor: 'pointer'
            },
            column: {
                borderWidth: 1,
                shadow: false
            },
            areaspline: {
                fillOpacity: 0.15,
                marker: {
                    fillColor: '#FFFFFF',
                    lineWidth: 2,
                    lineColor: null // inherit from series
                }
            },
            spline: {
                marker: {
                    fillColor: '#FFFFFF',
                    lineWidth: 2,
                    lineColor: null // inherit from series
                }
            },
            bar: {
                borderWidth: 1,
                shadow: false
            }
        },
        credits: { enabled: false },
        legend: { enabled: false },
        xAxis: {
            lineColor: '#eee',
            title: { text: null }
        },
        yAxis: {
            title: { text: null },
            gridLineColor: '#eee',
            labels: {
                formatter: function() {
                    return utilities.formatPrice(this.value,false);
                }
            }
        },
        tooltip: {
            formatter: function() {
                return utilities.formatPrice(this.y)+' kr.';
            }
        }
    });

    return chartUtils;
});