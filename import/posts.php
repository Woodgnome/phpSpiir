<?php
require_once(__DIR__ . "/../lib/include.php");
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$table = "posts";
$dir_path = $GLOBALS["ROOT"] . "/archive";
$files = array_filter(scandir($dir_path), function($filename){ return strpos($filename, "alle-poster-") !== false; });
rsort($files);
$json_filepath = $dir_path . "/" . reset($files);
$floats = [ "Amount", "OriginalAmount", "Balance" ];
$keys = [
  "account_period_id" => "accountId",
  "post_id" => "Id",
  "date_custom" => "CustomDate",
  "description_original" => "OriginalDescription",
  "subcategory_id" => "CategoryId",
  "amount_original" => "OriginalAmount",
  "currency_original" => "OriginalCurrency",
];
$sub_tables = [];

echo "Importing $json_filepath...\n";
import($table, $sub_tables, $json_filepath, $floats, $keys);
