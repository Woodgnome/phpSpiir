<?php
require_once(__DIR__ . "/../lib/include.php");
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$table = "countries";
$sub_tables = [];
$json_filepath = $GLOBALS["ROOT"] . "/archive/countries.json";
$floats = [];
$keys = [
  "country_id" => null,
];

import($table, $sub_tables, $json_filepath, $floats, $keys);
