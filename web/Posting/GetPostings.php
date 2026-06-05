<?php
require_once(__DIR__ . "/../../lib/include.php");

header("Content-Type: application/json");

$DB = $GLOBALS["DB"];

function year_week_to_time($year, $week, $start_of_week = true){
  $datetime = new DateTime();
  $datetime->setISODate($year, $week, $start_of_week ? 1 : 7);
  $datetime->setTime(...($start_of_week ? [ 0, 0, 0] : [ 23, 59, 59 ]));
  return $datetime->getTimestamp();
}

$page_size = 50;
$sortings = [
  "default" => "COALESCE(date_custom, date) DESC, post_id DESC",
  "Date" => "COALESCE(date_custom, date) ASC, post_id ASC",
  "DateDesc" => "COALESCE(date_custom, date) DESC, post_id DESC",
  "Description" => "description ASC, BINARY description DESC, post_id ASC",
  "DescriptionDesc" => "description DESC, BINARY description ASC, post_id DESC",
  "Category" => "sc.name ASC, post_id ASC",
  "CategoryDesc" => "sc.name DESC, post_id DESC",
  "Amount" => "p.amount ASC, post_id ASC",
  "AmountDesc" => "p.amount DESC, post_id DESC",
];
$start_at = !empty($_REQUEST["startAt"]) ? intval($_REQUEST["startAt"]) : 0;
$category_id = !empty($_REQUEST["categoryIds"]) ? intval($_REQUEST["categoryIds"]) : null;
$subcategory_id = !empty($_REQUEST["subcategoryIds"]) ? intval($_REQUEST["subcategoryIds"]) : null;
$from_month = !empty($_REQUEST["fromMonth"]) ? strtotime(substr_replace($_REQUEST["fromMonth"], "-", 4, 0) . "-01 00:00:00") : null;
$to_month = !empty($_REQUEST["toMonth"]) ? strtotime("last day of " . substr_replace($_REQUEST["toMonth"], "-", 4, 0) . "-01 23:59:59") : null;
$from_week = !empty($_REQUEST["fromWeek"]) ? year_week_to_time(...[ ...explode("W", $_REQUEST["fromWeek"]), true]) : null;
$to_week = !empty($_REQUEST["toWeek"]) ? year_week_to_time(...[ ...explode("W", $_REQUEST["toWeek"]), false]) : null;
$text_query = !empty($_REQUEST["textQuery"]) ? "'%" . $DB->escape($_REQUEST["textQuery"]) . "%'" : null;
$tags = !empty($_REQUEST["tags"]) ? array_map(function($tag){ return $GLOBALS["DB"]->escape($tag); }, explode(",", $_REQUEST["tags"])) : null;
$sorting = !empty($_REQUEST["sorting"]) && isset($sortings[$_REQUEST["sorting"]]) ? $_REQUEST["sorting"] : "default";
$sort_direction = !empty($_REQUEST["sortDescending"]) && $_REQUEST["sortDescending"] == "true" ? "Desc" : "";
$sorting .= $sort_direction;
$locked_subcategories = get_categories("Locked");

// Not supported, ensure an error is displayed in client (TODO)
if (!empty($_REQUEST["onlySinceLastLogin"])){
  http_response_code(400);
  exit();
}

$sql = "
  SELECT
    p.*,
    c.category_id,
    a.name AS account_name,
    sc.name subcategory_name
  FROM posts p
  JOIN account_periods ap ON p.account_period_id = ap.account_period_id
  JOIN accounts a ON ap.account_id = a.account_id
  LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
  LEFT JOIN categories c ON sc.category_id = c.category_id
  WHERE (split_group_id IS NULL OR split_group_id <> post_id) # Skip main post of splits as it would be a duplicate";
$all_posts = $DB->arrayQuery($sql);
$db_posts = $DB->arrayQuery("
  $sql
    " . (!empty($from_month) ? " AND COALESCE(date_custom, date) >= FROM_UNIXTIME($from_month)" : "") . "
    " . (!empty($to_month) ? " AND COALESCE(date_custom, date) <= FROM_UNIXTIME($to_month)" : "") . "
    " . (!empty($from_week) ? " AND COALESCE(date_custom, date) >= FROM_UNIXTIME($from_week)" : "") . "
    " . (!empty($to_week) ? " AND COALESCE(date_custom, date) <= FROM_UNIXTIME($to_week)" : "") . "
    " . (!empty($category_id) ? " AND c.category_id = $category_id" : "") . "
    " . (!empty($subcategory_id) ? " AND p.subcategory_id = $subcategory_id" : "") . "
    " . (!empty($text_query) ? " AND (description LIKE $text_query OR comment LIKE $text_query)" : "") . "
    " . (!empty($tags) ? implode("\n", array_map(function($tag){ return " AND tags REGEXP '[[:<:]]" . $tag . "[[:>:]]'"; }, $tags)) : "") . "
  ORDER BY " . $sortings[$sorting]
);
$all_posts_count = count($all_posts);
$all_posts_categorized_count = count(array_filter($all_posts, function($post){ return !empty($post["category_id"]); }));
$post_count = count($db_posts);
$post_categorized_count = count(array_filter($db_posts, function($post){ return !empty($post["category_id"]); }));
$page_posts = array_slice($db_posts, $start_at, $page_size);

function is_locked($post, $locked_subcategories){
  foreach ($locked_subcategories as $subcategory){
    if ($post["subcategory_id"] == $subcategory["subcategory_id"]){
      return true;
    }
  }
  return false;
}

$postings = [
  "postings" => array_map(
    function($post) use ($locked_subcategories){
      return [
        "id" => date("Ym", strtotime($post["date"])) . "-" . $post["post_id"],
        "date" => timestring(strtotime($post["date_custom"] ?? $post["date"])),
        "originalDate" => timestring(strtotime($post["date"])),
        "dateChanged" => !empty($post["date_custom"]),
        "tags" => !empty($post["tags"]) ? explode(";", $post["tags"]) : [],
        "isExtraordinary" => !empty($post["is_extraordinary"]),
        "isCounterEntry" => !empty($post["counter_entry_id"]),
        "isSubcategoryLocked" => !empty($post["counter_entry_id"]), // Usually when there's a counter_entry_id, but Spiir kept an unexposed separate list
        "amount" => $post["amount"] / 100,
        "balance" => $post["balance"] / 100,
        "subcategoryId" => $post["subcategory_id"] ?? "",
        "subcategoryName" => $post["subcategory_name"] ?? "",
        "description" => $post["description"],
        "originalDescription" => $post["description_original"],
        "comment" => $post["comment"],
        "hasTags" => !empty($post["tags"]),
        "accountName" => $post["account_name"],
        "isSplitChild" => !empty($post["split_group_id"]) && $post["split_group_id"] != $post["post_id"],
        "documentId" => null,
        "systemComment" => null, // Inconsistent, seems to be "" when isSubcategoryLocked is true, otherwise null
        "rowKey" => $post["post_id"],
      ];
    },
    $page_posts
  ),
  "pager" => [
    "startAt" => $start_at,
    "recordCount" => $post_count,
    "pageSize" => $page_size,
    "adjustWhenCategorized" => false
  ],
  "postingStatistics" => [
    "average" => $post_count > 0 ? array_sum(array_column($db_posts, "amount")) / $post_count / 100 : 0,
    "total" => array_sum(array_column($db_posts, "amount")) / 100,
    "postingsCount" => $post_count,
    "postingsCategorized" => $post_categorized_count,
    "hasPostings" => $post_count > 0,
    "overallPostingsCount" => $all_posts_count,
    "overallPostingsCategorized" => $all_posts_categorized_count
  ],
  "filter" => null,
];

echo json_encode($postings, JSON_PRETTY_PRINT);
