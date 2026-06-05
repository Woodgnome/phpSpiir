<?php
require_once(__DIR__ . "/../../lib/include.php");

header("Content-Type: application/json");

$now = time();
$start = !empty($_REQUEST["startMonth"]) ? strtotime(substr_replace($_REQUEST["startMonth"], "-", 4, 0) . "-01") : strtotime("first day of this month 00:00:00 -1 year");
$end = !empty($_REQUEST["endMonth"]) ? strtotime("last day of " . substr_replace($_REQUEST["endMonth"], "-", 4, 0) . " 23:59:59") : strtotime("last day of this month 23:59:59");

$config = [
  "summary_type" => "IncomeExpense",
  "categories" => [ "Income", "Expense", "Saving", null ],
];
list($start_month, $number_of_months, $months, $months_over, $extraordinary, $categories) = get_posts_summary($start, $end, $config);

// Output result
$result = [
  "months" => array_values(array_map(function($month){
    return [
      "income" => $month["Income"]["Total"] / 100,
      "month" => $month["month"],
      "categories" => array_map(function($category){
        return [
          "amount" => $category["amount"] / 100,
          "topPostings" => array_map(function($post){
            return [
              "amount" => $post["amount"] / 100,
              "description" => $post["description"],
            ];
          }, $category["posts"]),
          "categoryId" => $category["category_id"],
          "categoryName" => $category["category_name"],
        ];
      }, $month["categories"]),
      "fixedExpenses" => $month["Expense"]["Fixed"] / 100,
      "variableExpenses" => $month["Expense"]["Variable"] / 100,
      "savings" => 0, // $month["Saving"]["Total"] / 100, // Spiir ignores savings in monthly summaries, no idea why - we'll include it for completeness
      "result" => ($month["Income"]["Total"] + $month["Expense"]["Total"]) / 100,
      "resultWithSavings" => ($month["Income"]["Total"] + $month["Expense"]["Total"] /*+ $month["Saving"]["Total"]*/) / 100, // See comment above about savings
    ];
  }, $months)),
  "averageMonth" => [
    "description" => null,
    "numberOfMonths" => $number_of_months,
    "startMonth" => $start_month,
    "endMonth" => end($months_over)["month"],
    "income" => 0.01 / $number_of_months * array_sum(array_map(function($month){ return $month["Income"]["Total"]; }, $months_over)),
    "month" => null,
    "categories" => array_map(function($category) use ($number_of_months){
      return [
        "amount" => 0.01 / $number_of_months * $category["amount"],
        "topPostings" => array_map(function($post){
          return [
            "amount" => $post["amount"] / 100,
            "description" => $post["description"],
          ];
        }, $category["posts"]),
        "categoryId" => $category["category_id"],
        "categoryName" => $category["category_name"],
      ];
    }, $categories),
    "fixedExpenses" => 0.01 / $number_of_months * array_sum(array_map(function($month){ return $month["Expense"]["Fixed"]; }, $months_over)),
    "variableExpenses" => 0.01 / $number_of_months * array_sum(array_map(function($month){ return $month["Expense"]["Variable"]; }, $months_over)),
    "savings" => 0.01 / $number_of_months * array_sum(array_map(function($month){ return $month["Saving"]["Total"]; }, $months_over)),
    "result" => 0.01 / $number_of_months * array_sum(array_map(function($month){ return $month["Income"]["Total"] + $month["Expense"]["Total"]; }, $months_over)),
    "resultWithSavings" => 0.01 / $number_of_months * array_sum(array_map(function($month){
      return $month["Income"]["Total"] + $month["Expense"]["Total"] + $month["Saving"]["Total"];
    }, $months_over)),
  ],
  "startMonth" => $start_month,
  "endMonth" => date("Ym", $end),
  "extraordinaryIncome" => $extraordinary["Income"] / 100,
  "extraordinaryExpenses" => $extraordinary["Expense"] / 100,
  "extraordinarySavings" => $extraordinary["Saving"] / 100,
];
echo json_encode($result, JSON_PRETTY_PRINT);
