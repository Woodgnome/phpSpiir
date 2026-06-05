define(function(require) {
    var config = require('config');
    var session = require('session');

    var subcategoriesById = { };
    var categoriesById = { };

    _.each(session.subcategories, function(subcategory) {
        subcategoriesById[subcategory.id] = subcategory;
    });

    _.each(session.categories, function(category) {
        categoriesById[category.id] = category;
    });

    return {
        isSubcategoryId: function(categoryId) {
            return categoryId.length === 3;
        },

        isMainCategoryId: function(categoryId) {
            return categoryId && categoryId.length === 2;
        },

        getCategoriesComboboxSource: function(callback) {
            callback(session.categoryOptions);
        },

        getSubcategoriesComboboxSourceByCategoryId: function(categoryId) {
            var categoryMenuItem = _.find(session.categoryOptions, function(category) {
                return category.value == categoryId;
            });
            return categoryMenuItem.submenu;
        },

        getExpenseSubcategoriesComboboxSourceByExpenseType: function(expenseType, allowSelectAll) {
            var me = this;

            var expenseSubcategoryMenuItems = _.filter(session.subcategories, function (subcategory) { return subcategory.expenseType === expenseType && (subcategory.categoryType === 'Expense' || subcategory.categoryType === 'Saving'); });
            var subcategoriesByCategory = _.groupBy(expenseSubcategoryMenuItems, function(g) { return g.categoryId; });

            var categoryStructure = _.map(subcategoriesByCategory, function(subcategories, categoryId) {
                var category = _.find(session.categories, function(c) { return c.id === categoryId; });

                subcategories = _.map(subcategories, function(subcategory) {
                    var aliases = null;

                    if (subcategory.hints != null)
                        aliases = subcategory.hints.split(';');

                    return {
                        aliases: aliases,
                        label: subcategory.name,
                        selectable: true,
                        tag: subcategory.expenseType.camelCase(),
                        value: subcategory.id
                    };
                });

                if (allowSelectAll && subcategories.length > 1) {
                    subcategories.unshift({
                        label: 'Alt under ' + category.name,
                        selectable: true,
                        value: categoryId,
                        klass: 'strong'
                    });
                }

                return {
                    label: category.name,
                    selectable: false,
                    submenu: subcategories,
                    value: categoryId
                };
            });

            return categoryStructure;
        },

        formatExpenseType: function(expenseType) {
            if (expenseType === 2)
                return 'fixed';

            return null;
        },

        getSubcategoryNameById: function(subcategoryId) {
            return (subcategoriesById[subcategoryId] || { }).name;
        },

        getMainCategoryNameById: function(categoryId) {
            return (categoriesById[categoryId] || { }).name;
        },

        getCategoryNameById: function(categoryId) {
            var name;

            if (categoryId === "-1")
                name = 'Ikke kategoriseret';
            else if (categoryId === 'Bill')
                name = 'Regninger';
            else if (categoryId === 'Consumption')
                name = 'Forbrug';
            else if (this.isMainCategoryId(categoryId))
                name = this.getMainCategoryNameById(categoryId);
            else
                name = this.getSubcategoryNameById(categoryId);

            if (!name)
                console.log('CategoryService.getCategoryNameById: Unknown ID ' + categoryId);

            return name;
        },

        getMainCategoryId: function(subcategoryId) {
            return subcategoriesById[subcategoryId].categoryId;
        }
    };
});