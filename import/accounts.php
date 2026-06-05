<?php
require_once(__DIR__ . "/../lib/include.php");
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$table = "accounts";
$json_filepath = $GLOBALS["ROOT"] . "/archive/accounts.json";
$floats = [ "balance", "availableBalance" ];
$keys = [
  "account_id" => "id",
  "type" => "accountType",
  "type_explicitly_set" => "accountTypeExplicitlySet",
  "subcategory_id" => "accountSubcategoryId",
];
$sub_tables = [
  [
    "property" => "periods",
    "table" => "account_periods",
    "floats" => [ "endBalance", "startBalance" ],
    "keys" => [
      "account_period_id" => "accountId",
      "account_id" => [
        "parent_id_column" => "account_id",
        "parent_match_column" => "account_id",
        "parent_match_key" => "id",
        "sub_key" => "parent_account_id",
      ],
    ],
  ]
];

import($table, $sub_tables, $json_filepath, $floats, $keys);
