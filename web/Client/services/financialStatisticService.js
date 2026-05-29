define(function(require) {
    var networkService = require('./networkService');
    var config = require('config');


    return {
        getFinancialStatisticForCategory: function (categoryId) {
            if (!categoryId)
                categoryId = 'Consumption';

            return networkService.ajaxGet('getFinancialStatisticForCategory',
                { categoryId: categoryId }
            );
        }
    };
});