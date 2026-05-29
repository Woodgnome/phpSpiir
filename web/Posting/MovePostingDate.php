<?php
require_once(__DIR__ . "/../../lib/include.php");

$DB = $GLOBALS["DB"];

// Validate request
$request_valid = false;
if (!empty($_REQUEST["postingId"]) && !empty($_REQUEST["newDate"]) && strtotime($_REQUEST["newDate"]) !== false){
  $id = preg_replace("/^\d{6}-/", "", $_REQUEST["postingId"]); // Format is YYYYMM-{ID} - remove year/month
  $request_valid = !empty($DB->cellQuery("SELECT COUNT(*) FROM posts WHERE post_id = " . intval($id)));
}

if ($request_valid){
  $id = preg_replace("/^\d{6}-/", "", $_REQUEST["postingId"]);
  $date_original = strtotime($DB->cellQuery("SELECT date FROM posts WHERE post_id = " . intval($id)));
  $new_date = strtotime($_REQUEST["newDate"]);
  if (date("Y-m-d", $date_original) == date("Y-m-d", $new_date)){
    $new_date = null;
  }
  else {
    $new_date += date("Z"); // Offset by local timezone ("Z" = UTC offset in seconds)
  }
  update_post($id, [ "date_custom" => $new_date ]);
  http_response_code(204);
}
else {
  http_response_code(400);
}
