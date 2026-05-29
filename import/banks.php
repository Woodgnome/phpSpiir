<?php
require_once(__DIR__ . "/../lib/include.php");
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$table = "banks";
$sub_tables = [
  [
    "property" => "bankCredentials",
    "table" => "bank_credentials",
    "floats" => [],
    "keys" => [
      "bank_credential_id" => null,
      "bank_id" => [
        "parent_id_column" => "bank_id",
        "parent_match_column" => "id",
        "parent_match_key" => "id",
        "sub_key" => "bank_id",
      ],
    ],
  ]
];
$json_filepath = $GLOBALS["ROOT"] . "/archive/banks.json";
$floats = [];
$keys = [
  "bank_id" => null,
  "bank_api_disabled_message" => "bankApiDisabledMesssage",
];

import($table, $sub_tables, $json_filepath, $floats, $keys);
