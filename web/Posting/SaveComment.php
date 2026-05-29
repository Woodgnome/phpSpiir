<?php
require_once(__DIR__ . "/../../lib/include.php");

$DB = $GLOBALS["DB"];

// Validate request
$request_valid = false;
if (!empty($_REQUEST["postingId"]) && array_key_exists("comment", $_REQUEST)){
  $id = preg_replace("/^\d{6}-/", "", $_REQUEST["postingId"]); // Format is YYYYMM-{ID} - remove year/month
  $request_valid = !empty($DB->cellQuery("SELECT COUNT(*) FROM posts WHERE post_id = " . intval($id)));
}

if ($request_valid){
  $id = preg_replace("/^\d{6}-/", "", $_REQUEST["postingId"]);
  $values = [
    "comment" => null,
    "tags" => null,
  ];
  if (!empty($_REQUEST["comment"])){
    $values["comment"] = $_REQUEST["comment"];
    preg_match_all("/#([^# ]+)\b/", $_REQUEST["comment"], $matches);
    if (!empty($matches[1])){
      $values["tags"] = $matches[1];
    }
  }
  update_post($id, $values);
  http_response_code(204);
}
else {
  http_response_code(400);
}
