<?php
require_once(__DIR__ . "/../vendor/autoload.php");
require_once(__DIR__ . "/db.php");

$ROOT = "/var/www/spiir";
$GMTIME_FORMAT = "Y-m-d\TH:i:s\Z";

$dotenv = Dotenv\Dotenv::createImmutable($ROOT);
$dotenv->load();

$DB = new DB($_ENV["DB_HOST"], $_ENV["DB_USER"], $_ENV["DB_PASS"], $_ENV["DB_NAME"], true);

/**
 * timestring()
 */
function timestring($time){
  return gmdate($GLOBALS["GMTIME_FORMAT"], $time);
}

/**
 * sort_categories()
 */
function sort_categories($a, $b, $sort_type = null){
  // Amount (abs)
  if ($sort_type == "abs" || $sort_type == "abs_reverse"){
    if (abs($a["amount"]) != abs($b["amount"])){
      if ($sort_type == "abs_reverse"){
        return $b["amount"] - $a["amount"];
      }
      else {
        return $a["amount"] - $b["amount"];
      }
    }
  }
  
  // Amount
  if ($a["amount"] != $b["amount"]){
    if ($sort_type == "reverse"){
      return $b["amount"] - $a["amount"];
    }
    else {
      return $a["amount"] - $b["amount"];
    }
  }

  // Category ID
  if ($a["category_id"] == -1){
    return 1; // Unclear if this is correct return value
  }
  if ($b["category_id"] == -1){
    return -1;
  }
  return $a["category_id"] - $b["category_id"];
}

/**
 * sort_posts()
 */
function sort_posts($a, $b, $sort_type = null){
  // Amount (abs)
  if ($sort_type == "abs"){
    if (abs($a["amount"]) != abs($b["amount"])){
      return abs($b["amount"]) - abs($a["amount"]);
    }
  }

  // Amount
  if ($a["amount"] != $b["amount"]){
    if ($sort_type == "reverse"){
      return $b["amount"] - $a["amount"];
    }
    else {
      return $a["amount"] - $b["amount"];
    }
  }
  
  // Date
  $a_date = strtotime($a["date_custom"] ?? $a["date"]);
  $b_date = strtotime($b["date_custom"] ?? $b["date"]);
  if ($a_date != $b_date){
    return $a_date - $b_date;
  }
  
  // ID
  return $a["post_id"] - $b["post_id"];

  if ($sort_type == "abs" ? (abs($a["amount"]) == abs($b["amount"])) : ($a["amount"] == $b["amount"])){
    return strtotime(!empty($a["date_custom"]) ? $a["date_custom"] : $a["date"])
           - strtotime(!empty($b["date_custom"]) ? $b["date_custom"] : $b["date"]);
  }
  return $sort_type == "abs" ? (abs($b["amount"]) - abs($a["amount"])) : ($sort_type == "reverse" ? $b["amount"] - $a["amount"] : $a["amount"] - $b["amount"]);
}

/**
 * get_posts_summary()
 */
function get_posts_summary($start, $end, $config = []){
  $DB = $GLOBALS["DB"];
  $MAX_POSTS_PER_CATEGORY = 3;

  $where = !empty($config["where"]) ? $config["where"] : "";
  $sort_type = !empty($config["sort_type"]) ? $config["sort_type"] : null;
  $categories = array_map(
    function($category) use ($DB){ return "c.type " . ($category !== null ? "= '" . $DB->escape($category) . "'" : "IS NULL"); },
    !empty($config["categories"]) ? $config["categories"] : [],
  );
  $subcategories = array_map(
    function($subcategory) use ($DB){ return "sc.subcategory_id " . ($subcategory !== null ? "= '" . $DB->escape($subcategory) . "'" : "IS NULL"); },
    !empty($config["category_id"]) ? array_column(get_categories($config["category_id"]), "subcategory_id") : [],
  );
  //$subcategory_ids = !empty($config["category_id"]) ? array_column(get_categories($config["category_id"]), "subcategory_id") : [];

  $now = time();
  $start_month = date("Ym", $start);
  $number_of_months = (date("Y", min($now, $end)) - date("Y", $start)) * 12 + date("m", min($now, $end)) - date("m", $start);
  if (date("m", min($now, $end)) != date("m", strtotime(date("Y-m-d", min($now, $end)) . " +1 day"))){ // Add 1 extra month if this is the last day of the month
    $number_of_months++;
  }

  // Get posts
  $posts = $DB->arrayQuery($sql = "
    SELECT p.*,
          c.category_id,
          c.name AS category_name,
          c.type AS category_type,
          sc.name AS subcategory_name,
          sc.expense_type
    FROM posts p
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
    LEFT JOIN categories c ON sc.category_id = c.category_id
    WHERE ((date_custom IS NOT NULL
            AND date_custom >= FROM_UNIXTIME($start)
            AND date_custom <= FROM_UNIXTIME($end))
          OR (date_custom IS NULL
            AND date >= FROM_UNIXTIME($start)
            AND date <= FROM_UNIXTIME($end)))
      AND ((
          1
          " . ($config["summary_type"] == "Income" ? "AND amount > 0" : "") . " # Count only positive amounts as income
          " . ($config["summary_type"] == "Expense" ? "AND (c.category_id IS NOT NULL OR amount < 0)" : "") . " # Count only negative uncategorized posts as expenses
          " . (!empty($categories) ? "AND (" . implode(" OR ", $categories) . ")" : "") . "
          #" . (!empty($category_ids) ? "AND c.category_id IN (" . implode(", ", $category_ids) . ")" : "") . "
          " . (!empty($subcategories) ? "AND (" . implode(" OR ", $subcategories) . ")" : "") . "
          #" . (!empty($subcategory_ids) ? "AND (p.subcategory_id IN (" . implode(", ", $subcategory_ids) . ") )" : "") . "
        )
        OR p.is_extraordinary = '1'
           AND (" . ($config["summary_type"] == "Saving" ? "0" : "1") . ") # Extraordinary posts are fucking retared
      )
      ORDER BY COALESCE(date_custom, date) ASC
  ");
  //die($sql);

  // Set up initial values
  $categories = [];
  $subcategories = [];
  $extraordinary = [
    "Income" => 0,
    "Expense" => 0,
    "Saving" => 0,
    "Exclude" => 0,
  ];
  $months = [];
  $month = strtotime(date("Y-m-01", $start));
  while ($month < $end){
    $months[date("Ym", $month)] = [
      "month" => date("Ym", $month),
      "is_over" => strtotime("last day of " . date("Y-m", $month) . " 23:59:59") < $now,
      "categories" => [],
      "subcategories" => [],
      "Income" => [
        "Total" => 0,
        "Fixed" => 0,
        "Variable" => 0,
      ],
      "Expense" => [
        "Total" => 0,
        "Fixed" => 0,
        "Variable" => 0,
      ],
      "Saving" => [
        "Total" => 0,
        "Fixed" => 0,
        "Variable" => 0,
      ],
      "Exclude" => [
        "Total" => 0,
        "None" => 0,
      ],
    ];
    $month = strtotime(date("Y-m-d", $month) . " +1 month");
  }

  // Parse posts
  foreach ($posts as $post){
    $time = strtotime(!empty($post["date_custom"]) ? $post["date_custom"] : $post["date"]);
    $month = date("Ym", $time);

    // Fix uncategorized posts
    if (empty($post["category_id"]) || empty($post["subcategory_id"])){
      $post["category_id"] = "-1";
      $post["category_name"] = "Ikke kategoriseret";
      $post["subcategory_id"] = "-1";
      $post["subcategory_name"] = "Ikke kategoriseret";
      if ($config["summary_type"] == "IncomeExpense"){
        $post["category_type"] = $post["amount"] > 0 ? "Income" : "Expense";
        $post["expense_type"] = "Variable";
      }
      else {
        $post["category_type"] = $post["amount"] > 0 ? "Income" : "Expense";
        $post["expense_type"] = "Variable";
      }
    }

    // Count ordinary posts in month summaries and extraordinary separately
    if (empty($post["is_extraordinary"])){
      $months[$month][$post["category_type"]][$post["expense_type"]] += $post["amount"];
      $months[$month][$post["category_type"]]["Total"] += $post["amount"];

      // Categories and posts
      if ($config["summary_type"] != "IncomeExpense" || !in_array($post["category_type"], [ "Income", "Saving" ])){ // Do not show income/savings in IncomeExpense overview
        // Monthly
        if (empty($months[$month]["categories"][$post["category_id"]])){
          $months[$month]["categories"][$post["category_id"]] = [
            "amount" => 0,
            "posts" => [],
            "category_id" => $post["category_id"],
            "category_name" => $post["category_name"],
            "subcategory_id" => $post["subcategory_id"],
            "subcategory_name" => $post["subcategory_name"],
            "is_fixed" => false, // (Main) category is_fixed is always false because IsFixed is a property of subcategory
            "is_main_category" => empty($config["category_id"]) && $post["category_id"] != -1,
          ];
        }
        if (empty($months[$month]["subcategories"][$post["subcategory_id"]])){
          $months[$month]["subcategories"][$post["subcategory_id"]] = [
            "amount" => 0,
            "posts" => [],
            "category_id" => $post["category_id"],
            "category_name" => $post["category_name"],
            "subcategory_id" => $post["subcategory_id"],
            "subcategory_name" => $post["subcategory_name"],
            "is_fixed" => $post["expense_type"] == "Fixed",
            "is_main_category" => false,
          ];
        }
        $months[$month]["categories"][$post["category_id"]]["amount"] += $post["amount"];
        $months[$month]["categories"][$post["category_id"]]["posts"][] = $post;
        $months[$month]["subcategories"][$post["subcategory_id"]]["amount"] += $post["amount"];
        $months[$month]["subcategories"][$post["subcategory_id"]]["posts"][] = $post;
    
        // Average
        if (empty($categories[$post["category_id"]])){
          $categories[$post["category_id"]] = [
            "amount" => 0,
            "posts" => [],
            "category_id" => $post["category_id"],
            "category_name" => $post["category_name"],
            "subcategory_id" => $post["subcategory_id"],
            "subcategory_name" => $post["subcategory_name"],
            "is_fixed" => false, // (Main) category is_fixed is always false because IsFixed is a property of subcategory
            "is_main_category" => $post["category_id"] != -1,
          ];
        }
        if ($months[$month]["is_over"]){ // Only include in average if month is over
          if (empty($subcategories[$post["subcategory_id"]])){
            $subcategories[$post["subcategory_id"]] = [
              "amount" => 0,
              "posts" => [],
              "category_id" => $post["category_id"],
              "category_name" => $post["category_name"],
              "subcategory_id" => $post["subcategory_id"],
              "subcategory_name" => $post["subcategory_name"],
              "is_fixed" => $post["expense_type"] == "Fixed",
              "is_main_category" => false,
            ];
          }
          $categories[$post["category_id"]]["amount"] += $post["amount"];
          $categories[$post["category_id"]]["posts"][] = $post;
          $subcategories[$post["subcategory_id"]]["amount"] += $post["amount"];
          $subcategories[$post["subcategory_id"]]["posts"][] = $post;
        }
      }
    }
    else {
      //print_r($post);
      $extraordinary[$post["category_type"]] += $post["amount"];
    }
  }

  // Sort monthly categories and posts (limit to top 3)
  foreach ($months as $month_index => $month){
    // Ensure "Not categorized" is always present (in past months) for IncomeExpense summary
    if ($config["summary_type"] == "IncomeExpense" && empty($months[$month_index]["categories"][-1]) && strtotime($month["month"] . "01") < $now){
      $months[$month_index]["categories"][-1] = [
        "amount" => 0,
        "posts" => [],
        "category_id" => "-1",
        "category_name" => "Ikke kategoriseret",
        "subcategory_id" => "-1",
        "subcategory_name" => "Ikke kategoriseret",
        "is_fixed" => $post["expense_type"] == "Fixed",
        "is_main_category" => false,
      ];
    }

    // Sort
    usort($months[$month_index]["categories"], function($a, $b) use($sort_type){ return sort_categories($a, $b, $sort_type); });
    foreach ($months[$month_index]["categories"] as $category_index => $category){
      usort($months[$month_index]["categories"][$category_index]["posts"], function($a, $b) use($sort_type){ return sort_posts($a, $b, $sort_type); });
      $months[$month_index]["categories"][$category_index]["posts"] = array_slice($months[$month_index]["categories"][$category_index]["posts"], 0, $MAX_POSTS_PER_CATEGORY);
    }
    usort($months[$month_index]["subcategories"], function($a, $b) use($sort_type){ return sort_categories($a, $b, $sort_type); });
    foreach ($months[$month_index]["subcategories"] as $subcategory_index => $subcategory){
      usort($months[$month_index]["subcategories"][$subcategory_index]["posts"], function($a, $b) use($sort_type){ return sort_posts($a, $b, $sort_type); });
      $months[$month_index]["subcategories"][$subcategory_index]["posts"] = array_slice($months[$month_index]["subcategories"][$subcategory_index]["posts"], 0, $MAX_POSTS_PER_CATEGORY);
    }
  }

  // Ensure average "Not categorized" is always present
  if (empty($categories[-1])){
    $categories[-1] = [
      "amount" => 0,
      "posts" => [],
      "category_id" => "-1",
      "category_name" => "Ikke kategoriseret",
      "is_fixed" => false,
      "is_main_category" => false,
    ];
  }

  // Sort average categories and posts (limit to top 3)
  usort($categories, function($a, $b) use($sort_type){ return sort_categories($a, $b, $sort_type); });
  foreach ($categories as $category_index => $category){
    usort($categories[$category_index]["posts"], function($a, $b) use($sort_type){ return sort_posts($a, $b, $sort_type); });
    $categories[$category_index]["posts"] = array_slice($categories[$category_index]["posts"], 0, $MAX_POSTS_PER_CATEGORY);
  }
  usort($subcategories, function($a, $b) use($sort_type){ return sort_categories($a, $b, $sort_type); });
  
  foreach ($subcategories as $subcategory_index => $subcategory){
    usort($subcategories[$subcategory_index]["posts"], function($a, $b) use($sort_type){ return sort_posts($a, $b, $sort_type); });
    $subcategories[$subcategory_index]["posts"] = array_slice($subcategories[$subcategory_index]["posts"], 0, $MAX_POSTS_PER_CATEGORY);
  }

  $months_over = array_filter($months, function($month){ return $month["is_over"]; });

  return [ $start_month, $number_of_months, $months, $months_over, $extraordinary, $categories, $subcategories ];
}

/**
 * get_categories()
 */
function get_categories($category_id){
  $DB = $GLOBALS["DB"];

  if (is_numeric($category_id)){
    switch ($category_id){
      case 11: // Indkomst
        return $DB->arrayQuery("
          SELECT * FROM subcategories
          WHERE category_id = " . intval($category_id) . "
          ORDER BY FIELD(subcategory_id, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 190, 113)
        ");
      
      case 12: // Bolig
        return $DB->arrayQuery("
          SELECT * FROM subcategories
          WHERE category_id = " . intval($category_id) . "
          ORDER BY FIELD(subcategory_id, 114, 115, 116, 117, 118, 119, 120, 121, 122, 195, 187)
        ");
      
      case 16: // Andre leveomkostninger
        return $DB->arrayQuery("
          SELECT * FROM subcategories
          WHERE category_id = " . intval($category_id) . "
          ORDER BY FIELD(subcategory_id, 134, 153, 142, 143, 144, 145, 146, 154, 148, 149, 189, 191)
        ");
      
      case 17: // Privatforbrug
        return $DB->arrayQuery("
          SELECT * FROM subcategories
          WHERE category_id = " . intval($category_id) . "
          #ORDER BY FIELD(subcategory_id, 147, 151, 155, 156, 157, 158, 159, 163, 186, 161, 164, 162, 160, 165, 167, 168, 169, 188, 172, 193, 194, 170)
          ORDER BY FIELD(subcategory_id, 155, 156, 157, 158, 159, 163, 186, 161, 164, 162, 147, 151, 160, 165, 167, 168, 169, 188, 172, 193, 194, 170)
        ");
        
      default:
        return $DB->arrayQuery("
          SELECT * FROM subcategories
          WHERE category_id = " . intval($category_id) . "
          ORDER BY subcategory_id ASC
        ");
    }
  }
  else if (is_string($category_id)){
    switch ($category_id){
      case "Expense":
        return $DB->arrayQuery("
          SELECT * FROM categories
          WHERE type = 'Expense'
          ORDER BY sort ASC
        ");
      
      case "Consumption":
        $subcategories = $DB->arrayQuery("
          SELECT sc.* FROM subcategories sc
          JOIN categories c ON sc.category_id = c.category_id
          WHERE sc.expense_type = 'Variable'
            AND c.type = 'Expense'
          ORDER BY subcategory_id ASC
        ");
        $subcategories[] = [ // Ensure uncategorized posts are not unintentionally skipped
          "subcategory_id" => null,
          "category_id" => null,
          "name" => null,
          "expense_type" => null,
          "hints" => null,
          "comparison_ignore" => 1,
        ];
        return $subcategories;
      
      case "Bill":
        return $DB->arrayQuery($sql = "
          SELECT sc.*, 0 AS comparison_ignore FROM subcategories sc
          JOIN categories c ON sc.category_id = c.category_id
          WHERE sc.expense_type = 'Fixed'
            AND c.type = 'Expense'
          UNION
          SELECT sc.*, 1 AS comparison_ignore FROM subcategories sc
          JOIN categories c ON sc.category_id = c.category_id
          WHERE c.type = 'Saving'
          ORDER BY subcategory_id ASC
        ");
      
      case "Income":
        $subcategories = $DB->arrayQuery($sql = "
          SELECT sc.* FROM subcategories sc
          JOIN categories c ON sc.category_id = c.category_id
          WHERE c.type = 'Income'
          ORDER BY subcategory_id ASC
        ");
        $subcategories[] = [ // Ensure uncategorized posts are not unintentionally skipped
          "subcategory_id" => null,
          "category_id" => null,
          "name" => null,
          "expense_type" => null,
          "hints" => null,
          "comparison_ignore" => 1,
        ];
        return $subcategories;
      
      case "Saving":
        return $DB->arrayQuery($sql = "
          SELECT sc.* FROM subcategories sc
          JOIN categories c ON sc.category_id = c.category_id
          WHERE c.type = 'Saving'
          ORDER BY subcategory_id ASC
        ");

      case "Loan":
        return $DB->arrayQuery($sql = "
          SELECT * FROM subcategories
          WHERE subcategory_id IN (114, 123, 178, 179)
        ");
      
      case "Locked":
        return $DB->arrayQuery($sql = "
          SELECT * FROM subcategories
          WHERE subcategory_id IN (100)
        ");

      case "Locked savings":
        return $DB->arrayQuery($sql = "
          SELECT * FROM subcategories
          WHERE subcategory_id IN (182, 183, 184, 185)
        ");
      
      default:
        return [];
    }
  }
}

/**
 * parse_query_string()
 *
 * Custom query string parser capable of handling repeated parameters, for example, ?param=value1&param=value2
 */
function parse_query_string($query_string, $repeated_keys = []){
  $parameters = [];
  $parts = explode("&", trim($query_string, "?& "));
  foreach ($parts as $part){
    list($key, $value) = explode("=", $part);
    $key = rawurldecode($key);
    $value = rawurldecode($value);
    if (in_array($key, $repeated_keys)){
      $parameters[$key][] = $value;
    }
    else {
      $parameters[$key] = $value;
    }
  }

  return $parameters;
}

/**
 * sanitize_post_values()
 */
function sanitize_post_values($fields){
  $DB = $GLOBALS["DB"];

  $values = [];
  foreach ($fields as $key => $value){
    switch ($key){
      case "account_period_id":
      case "amount":
      case "amount_original":
        $values[] = intval($value);
        break;
      
      case "category_id":
      case "subcategory_id":
      case "balance":
      case "counter_entry_id":
      case "split_group_id":
        $values[] = !empty($value) ? intval($value) : "NULL";
        break;
      
      case "date":
        $values[] = "FROM_UNIXTIME(" . (is_numeric($value) ? $value : strtotime($value)) . ")";
        break;
      
      case "date_custom":
        $values[] = !empty($value) ? "FROM_UNIXTIME(" . (is_numeric($value) ? $value : strtotime($value)) . ")" : "NULL";
        break;
      
      case "description":
      case "description_original":
      case "currency":
      case "currency_original":
        $values[] = "'" . $DB->escape($value) . "'";
        break;
      
      case "comment":
        $values[] = !empty($value) ? "'" . $DB->escape($value) . "'" : "NULL";
        break;
      
      case "tags":
        $values[] = !empty($value) ? "'" . $DB->escape(implode(";", $value)) . "'" : "NULL";
        break;
      
      case "is_extraordinary":
        $values[] = $value ? 1 : 0;
        break;

      default:
        break;
    }
  }

  return $values;
}

/**
 * create_new_post()
 */
function create_new_post($account_period_id, $date, $amount, $fields){
  $DB = $GLOBALS["DB"];

  $fields["amount"] = $amount;
  $fields["amount_original"] = $amount;
  $fields["date"] = $date;
  $fields["currency"] = "DKK";
  $fields["currency_original"] = "DKK";
  if (array_key_exists("subcategory_id", $fields)){
    if ($fields["subcategory_id"] === null){
      $fields["category_id"] = NULL;
    }
    else {
      $category_id = $DB->cellQuery("SELECT category_id FROM subcategories WHERE subcategory_id = " . intval($fields["subcategory_id"]));
      if (!empty($category_id)){
        $fields["category_id"] = $category_id;
      }
    }
  }
  $values = sanitize_post_values($fields);
  $columns = array_map(function($key) use ($DB){
    return "`" . $DB->escape($key) . "`";
  }, array_keys($fields));
  $DB->query($sql = "
    INSERT INTO posts (" . implode(", ", $columns) . ")
    VALUES (" . implode(", ", $values) . ")
  ");
  $id = $DB->getLastInsertID();

  return $id;
}

/**
 * update_post()
 */
function update_post($post_id, $fields){
  $DB = $GLOBALS["DB"];

  if (array_key_exists("subcategory_id", $fields)){
    if ($fields["subcategory_id"] === null){
      $fields["category_id"] = NULL;
    }
    else {
      $category_id = $DB->cellQuery("SELECT category_id FROM subcategories WHERE subcategory_id = " . intval($fields["subcategory_id"]));
      if (!empty($category_id)){
        $fields["category_id"] = $category_id;
      }
    }
  }
  $values = sanitize_post_values($fields);
  $updates = array_map(function($column, $value) use ($DB){
    return "`" . $DB->escape($column) . "` = $value";
  }, array_keys($fields), $values);
  $DB->query($sql = "
    UPDATE posts
    SET " . implode(", ", $updates) . "
    WHERE post_id = " . intval($post_id)
  );
}

/**
 * remove_post()
 */
function remove_post($post_id){
  $DB = $GLOBALS["DB"];
  $DB->query("
    DELETE FROM posts
    WHERE post_id = " . intval($post_id)
  );
}
