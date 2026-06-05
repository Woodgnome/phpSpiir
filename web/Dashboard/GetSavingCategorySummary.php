<?php
require_once(__DIR__ . "/../../lib/include.php");

header("Content-Type: application/json");

$DB = $GLOBALS["DB"];

$now = time();
$start = !empty($_REQUEST["startMonth"]) ? strtotime(substr_replace($_REQUEST["startMonth"], "-", 4, 0) . "-01") : strtotime("first day of this month 00:00:00 -1 year");
$end = !empty($_REQUEST["endMonth"]) ? strtotime("last day of " . substr_replace($_REQUEST["endMonth"], "-", 4, 0) . " 23:59:59") : strtotime("last day of this month 23:59:59");

$config = [
  "summary_type" => "Saving",
  "sort_type" => "abs_reverse",
  "categories" => [ "Saving" ],
  "category_id" => "Saving",
];
list($start_month, $number_of_months, $months, $months_over, $extraordinary, $categories, $subcategories) = get_posts_summary($start, $end, $config);

$db_categories = get_categories("Saving");

// Filter out non-categorized entries with no posts
foreach ($months as $index => $month){
  $months[$index]["categories"] = array_filter($month["categories"], function($category){ return $category["category_id"] != -1 || !empty($category["posts"]); });
}
$categories = array_filter($categories, function($category){ return $category["category_id"] != -1 || !empty($category["posts"]); });

// Output result
$result = [
  "summary" => [
    "months" => array_values(array_map(function($month){
      return [
        "total" => $month["Saving"]["Total"] / 100,
        "month" => $month["month"],
        "categories" => array_values(array_map(function($category){
          return [
            "categoryId" => $category["subcategory_id"],
            "categoryName" => $category["subcategory_name"],
            "amount" => $category["amount"] / 100,
            "isFixed" => $category["is_fixed"],
            "topPostings" => array_map(function($post){
              return [
                "amount" => $post["amount"] / 100,
                "description" => $post["description"],
              ];
            }, $category["posts"]),
            "isMainCategory" => $category["is_main_category"],
          ];
        }, $month["subcategories"])),
      ];
    }, $months)),
    "averageMonth" => [
      "description" => null,
      "numberOfMonths" => $number_of_months,
      "startMonth" => $start_month,
      "endMonth" => end($months_over)["month"],
      "total" => 0.01 / $number_of_months * array_sum(array_map(function($month){ return $month["Saving"]["Total"]; }, $months_over)),
      "month" => null,
      "categories" => array_values(array_map(function($category) use ($number_of_months){
        return [
          "categoryId" => $category["subcategory_id"],
          "categoryName" => $category["subcategory_name"],
          "amount" => 0.01 / $number_of_months * $category["amount"],
          "isFixed" => $category["is_fixed"],
          "topPostings" => array_map(function($post){
            return [
              "amount" => $post["amount"] / 100,
              "description" => $post["description"],
            ];
          }, $category["posts"]),
          "isMainCategory" => $category["is_main_category"],
        ];
      }, $subcategories)),
    ],
    "reportType" => "Saving",
    "startMonth" => $start_month,
    "endMonth" => date("Ym", $end),
    "extraordinaryIncome" => $extraordinary["Income"] / 100,
    "extraordinaryExpenses" => $extraordinary["Expense"] / 100,
    "extraordinarySavings" => $extraordinary["Saving"] / 100,
  ],
  "comparisonCategories" => array_values(array_map(
    function($db_category){
      return [
        "rowKey" => $db_category["subcategory_id"],
        "name" => $db_category["name"],
      ];
    },
    array_filter($db_categories, function($db_category){ return empty($db_category["comparison_ignore"]); })),
  ),
];
echo json_encode($result, JSON_PRETTY_PRINT);
