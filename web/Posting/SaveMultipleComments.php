<?php
require_once(__DIR__ . "/../../lib/include.php");

$DB = $GLOBALS["DB"];

$json_body = file_get_contents('php://input');
$request = json_decode($json_body, true);

// Validate request
$request_valid = false;
if (!empty($request) && is_array($request) && !empty($request["commentsByPostingId"])){
  $request_valid = true;
  foreach ($request["commentsByPostingId"] as $posting_id => $comment){
    $id = preg_replace("/^\d{6}-/", "", $posting_id); // Format is YYYYMM-{ID} - remove year/month
    $request_valid &= !empty($DB->cellQuery("SELECT COUNT(*) FROM posts WHERE post_id = " . intval($id)));
  }
}

if ($request_valid){
  foreach ($request["commentsByPostingId"] as $posting_id => $comment){
    $id = preg_replace("/^\d{6}-/", "", $posting_id);
    $values = [
      "comment" => null,
      "tags" => null,
    ];
    if (!empty($comment)){
      $values["comment"] = $comment;
      preg_match_all("/#([^# ]+)\b/", $comment, $matches);
      if (!empty($matches[1])){
        $values["tags"] = $matches[1];
      }
    }
    update_post($id, $values);
  }
  http_response_code(204);
}
else {
  http_response_code(400);
}
