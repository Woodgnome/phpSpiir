<?php
require_once(__DIR__ . "/../lib/include.php");
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$table = "subcategories";
$sub_tables = [];
$json_filepath = $GLOBALS["ROOT"] . "/archive/subcategories.json";
$floats = [];
$keys = [
  "subcategory_id" => "id",
];

import($table, $sub_tables, $json_filepath, $floats, $keys);
