<?php
require_once(__DIR__ . "/../lib/include.php");
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$table = "categories";
$sub_tables = [];
$json_filepath = $GLOBALS["ROOT"] . "/archive/categories.json";
$floats = [];
$keys = [
  "category_id" => "id",
  "type" => "categoryType",
  "sort" => "sortingPosition",
];

import($table, $sub_tables, $json_filepath, $floats, $keys);
