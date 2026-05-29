<?php
require_once(__DIR__ . "/../../lib/include.php");

$DB = $GLOBALS["DB"];

// Use custom query string parser to handle repeated query parameter 'postingIds'
$request_body = file_get_contents('php://input');
$params = parse_query_string($request_body, [ "postingIds" ]);

// Validate request
$request_valid = false;
if (!empty($params["postingIds"]) && !empty($params["isExtraordinary"])){
  $request_valid = true;
  foreach ($params["postingIds"] as $posting_id){
    $id = preg_replace("/^\d{6}-/", "", $posting_id); // Format is YYYYMM-{ID} - remove year/month
    $request_valid &= !empty($DB->cellQuery("SELECT COUNT(*) FROM posts WHERE post_id = " . intval($id)));
  }
  $request_valid &= in_array($params["isExtraordinary"], [ "true", "false" ]);
}

if ($request_valid){
  foreach ($params["postingIds"] as $posting_id){
    $id = preg_replace("/^\d{6}-/", "", $posting_id);
    update_post($id, [ "is_extraordinary" => $params["isExtraordinary"] == "true" ]);
  }
  http_response_code(204);
}
else {
  http_response_code(400);
}
