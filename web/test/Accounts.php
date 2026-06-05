<?php
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$entries = [
  "banks" => [
    "json_path" => __DIR__ . "/../../archive/banks.json",
    "path" => "/Account/GetBanks.php",
    "query" => "_t=1777147443644",
  ],
  "account_groups" => [
    "json_path" => __DIR__ . "/../../archive/accounts.json",
    "path" => "/Account/GetAccountGroups.php",
    "query" => "_t=1777147443644",
  ],
];
foreach ($entries as $key => $entry){
  $limit = 0.1;
  $a = json_decode(file_get_contents($entry["json_path"]), true);
  $b = json_decode(get_my_spiir_url($_ENV["SCHEME"] . "://" . $_ENV["HOST"] . $entry["path"] . "?" . $entry["query"]), true);

  echo $key . "\n";
  echo "========================================================================================================================\n\n";
  try {
    $items_ignored = compare_recursive($a, $b, [ "rowKey", "name" ]);
    if (!empty($items_ignored)){
      foreach ($items_ignored as $ignored_item){
        list($keys, $a, $b) = $ignored_item;
        echo implode("", array_map(function($key){ return "[$key]"; }, $keys)) . ": " . stringify($a) . " != " . stringify($b) . "\n";
      }
      echo "\n";
    }
  }
  catch (Exception $ex){
    $message = $ex->getMessage();
    echo $_ENV["SCHEME"] . "://" . $_ENV["HOST"] . $_ENV["HOST"] . $entry["path"] . "?" . $entry["query"] . "\n\n";
    echo "Theirs <--> Mine\n";
    echo $message. "\n\n";
    $keys = preg_split("/ +/", preg_replace("/(:.*|\[|\])/", " ", $message), -1, PREG_SPLIT_NO_EMPTY);
    echo "Mine:\n";
    print_recursive_simple($b, $keys);
    exit();
  }
}