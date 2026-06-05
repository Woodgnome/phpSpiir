<?php
require_once(__DIR__ . "/../../lib/include.php");

$DB = $GLOBALS["DB"];

$json_body = file_get_contents('php://input');
$request = json_decode($json_body, true);

// Validate request
$request_valid = false;
if (!empty($request) && is_array($request) && !empty($request["splitParentId"]) && !empty($request["splitDefinitions"])){
  $request_valid = true;
  $id = preg_replace("/^\d{6}-/", "", $request["splitParentId"]); // Format is YYYYMM-{ID} - remove year/month
  $request_valid &= !empty($DB->cellQuery("SELECT COUNT(*) FROM posts WHERE post_id = " . intval($id)));
  foreach ($request["splitDefinitions"] as $split){
    if ($split["postingId"] !== null){
      $id = preg_replace("/^\d{6}-/", "", $split["postingId"]);
      $request_valid &= !empty($DB->cellQuery("SELECT COUNT(*) FROM posts WHERE post_id = " . intval($id)));
    }
    if (!empty($split["subcategoryId"])){
      $request_valid &= !empty($DB->cellQuery("SELECT COUNT(*) FROM subcategories WHERE subcategory_id = " . intval($split["subcategoryId"])));
    }
    $request_valid &= isset($split["amount"]) && is_numeric($split["amount"])
                      && isset($split["subcategoryId"]) && is_numeric($split["subcategoryId"])
                      && (empty($split["comment"]) || is_string($split["comment"]));
  }
}

if ($request_valid){
  $parent_id = intval(preg_replace("/^\d{6}-/", "", $request["splitParentId"]));
  $parent_post = $DB->rowQuery("SELECT * FROM posts WHERE post_id = $parent_id");
  $split_posts = $DB->arrayQuery("
    SELECT * FROM posts
    WHERE split_group_id = $parent_id
      AND post_id <> $parent_id
  ");
  if (count($request["splitDefinitions"]) <= 1){
    // A single split definition means we're removing the split (testing <= 1 to be on the safe side)
    if (count($request["splitDefinitions"]) == 1){
      // Transfer comment and category to original post
      $parent_post["comment"] = $request["splitDefinitions"][0]["comment"];
      $parent_post["subcategory_id"] = $request["splitDefinitions"][0]["subcategoryId"];
    }
    $request["splitDefinitions"] = []; // Empty list to delete all split posts
  }
  foreach ($request["splitDefinitions"] as $split_definition){
    preg_match_all("/#([^# ]+)\b/", $split_definition["comment"] ?? "", $matches);
    $tags = !empty($matches[1]) ? $matches[1] : [];

    // New split posts
    if ($split_definition["postingId"] === null){
      create_new_post(
        $parent_post["account_period_id"],
        $parent_post["date"],
        $split_definition["amount"] * 100,
        [
          "account_period_id" => $parent_post["account_period_id"],
          "date_custom" => $parent_post["date_custom"],
          "description" => $parent_post["description"],
          "description_original" => $parent_post["description_original"],
          "subcategory_id" => $split_definition["subcategoryId"],
          "comment" => !empty($split_definition["comment"]) ? $split_definition["comment"] : null,
          "tags" => $tags,
          "is_extraordinary" => $parent_post["is_extraordinary"],
          "split_group_id" => $parent_post["post_id"],
        ]
      );
    }

    // Updated split posts
    else {
      $post_id = intval(preg_replace("/^\d{6}-/", "", $split_definition["postingId"]));
      update_post($post_id, [
        "amount" => $split_definition["amount"] * 100,
        "subcategory_id" => $split_definition["subcategoryId"],
        "comment" => !empty($split_definition["comment"]) ? $split_definition["comment"] : null,
      ]);
    }
  }

  // Removed split posts
  foreach ($split_posts as $split_post){
    $matching_split_definitions = array_filter($request["splitDefinitions"], function($split_definition) use ($split_post){
      return date("Ym-", strtotime($split_post["date_custom"] ?? $split_post["date"])) . $split_post["post_id"] == $split_definition["postingId"];
    });
    if (count($matching_split_definitions) == 0){
      remove_post($split_post["post_id"]);
    }
  }

  // Update parent post
  update_post($parent_post["post_id"], [
    "comment" => $parent_post["comment"],
    "subcategory_id" => $parent_post["subcategory_id"],
    "split_group_id" => count($request["splitDefinitions"]) > 1 ? $parent_post["post_id"] : null,
  ]);

  http_response_code(204);
}
else {
  http_response_code(400);
}
