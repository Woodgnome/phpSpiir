<?php
require_once(__DIR__ . "/../../lib/include.php");

$DB = $GLOBALS["DB"];

// Validate request
$request_valid = false;
if (!empty($_REQUEST["postingId"])){
  $id = preg_replace("/^\d{6}-/", "", $_REQUEST["postingId"]); // Format is YYYYMM-{ID} - remove year/month
  $request_valid = !empty($DB->cellQuery("SELECT COUNT(*) FROM posts WHERE post_id = " . intval($id)));
}

if ($request_valid){
  $id = preg_replace("/^\d{6}-/", "", $_REQUEST["postingId"]);
  $post = $DB->rowQuery("SELECT * FROM posts WHERE post_id = " . intval($id));

  // Existing split
  if (!empty($post["split_group_id"])){
    $parent_post = $DB->rowQuery("SELECT * FROM posts WHERE post_id = " . $post["split_group_id"]);
    $split_posts = $DB->arrayQuery("
      SELECT * FROM posts
      WHERE split_group_id = " . $post["split_group_id"] . "
        AND post_id <> " . $post["split_group_id"]
    );
    $split_definitions = array_map(function($post){
      return [
        "postingId" => date("Ym-", strtotime($post["date_custom"] ?? $post["date"])) . $post["post_id"],
        "subcategoryId" => $post["subcategory_id"],
        "amount" => $post["amount"] / 100,
        "comment" => $post["comment"],
        "isNew" => false,
      ];
    }, $split_posts);
  }

  // New split
  else {
    $parent_post = $post;
    $split_definitions = [
      [
        "postingId" => null,
        "subcategoryId" => $parent_post["subcategory_id"],
        "amount" => $parent_post["amount"] / 100,
        "comment" => $parent_post["comment"],
        "isNew" => true,
      ],
      [
        "postingId" => null,
        "subcategoryId" => null,
        "amount" => 0,
        "comment" => null,
        "isNew" => true,
      ]
    ];
  }

  $response = [
    "splitParentId" => date("Ym-", strtotime($parent_post["date_custom"] ?? $parent_post["date"])) . $parent_post["post_id"],
    "date" => timestring(strtotime($parent_post["date_custom"] ?? $parent_post["date"])),
    "description" => $parent_post["description"],
    "parentAmount" => $parent_post["amount"] / 100,
    "splitDefinitions" => $split_definitions,
  ];
  header("Content-Type: application/json");
  echo json_encode($response);
}
else {
  http_response_code(400);
}
