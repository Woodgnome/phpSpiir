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
  $counter_post = $DB->rowQuery("SELECT * FROM posts WHERE post_id = " . $post["counter_entry_id"]);
  update_post($post["post_id"], [ "counter_entry_id" => null ]);
  if (!empty($counter_post)){
    update_post($counter_post["post_id"], [ "counter_entry_id" => null ]);
  }
  http_response_code(204);
}
else {
  http_response_code(400);
}
