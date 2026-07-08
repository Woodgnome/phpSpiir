<?php
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$entries = [
  "banks" => [
    "json_path" => __DIR__ . "/../../archive/banks.json",
    "path" => "/Account/GetBanks.php",
    "query" => "_t=1777147443644",
    "ignore_keys" => [ "searchHints" ],
  ],
  "balance_history_lsb" => [
    "json_path" => __DIR__ . "/../../archive/BalanceHistory_LSB.json",
    "path" => "/Account/GetBalanceHistory.php",
    "query" => "_t=1780659561226&accountGroupId=635465073863192508",
    "ignore_keys" => [ "balance" ],
  ],
  "balance_history_opsparing" => [
    "json_path" => __DIR__ . "/../../archive/BalanceHistory_opsparing.json",
    "path" => "/Account/GetBalanceHistory.php",
    "query" => "_t=1780659561226&accountGroupId=636687979505357445",
    "ignore_keys" => [],
  ],
  "balance_history_nordea" => [
    "json_path" => __DIR__ . "/../../archive/BalanceHistory_Nordea.json",
    "path" => "/Account/GetBalanceHistory.php",
    "query" => "_t=1780659561226&accountGroupId=634927656802598587",
    "ignore_keys" => [ "balance" ],
  ],
  "account_groups" => [
    "json_path" => __DIR__ . "/../../archive/accounts.json",
    "path" => "/Account/GetAccountGroups.php",
    "query" => "_t=1777147443644",
    "ignore_keys" => [ "ignoredPostingCount", "numberOfPostings" ],
  ],
];
foreach ($entries as $key => $entry){
  $limit = 0.1;
  $a = json_decode(file_get_contents($entry["json_path"]), true);
  $b = json_decode(get_my_spiir_url($_ENV["SCHEME"] . "://" . $_ENV["HOST"] . $entry["path"] . "?" . $entry["query"]), true);

  echo $key . "\n";
  echo "========================================================================================================================\n\n";
  try {
    $items_ignored = compare_recursive($a, $b, $entry["ignore_keys"]);
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
    echo $_ENV["SCHEME"] . "://" . $_ENV["HOST"] . $entry["path"] . "?" . $entry["query"] . "\n\n";
    echo "Theirs <--> Mine\n";
    echo $message. "\n\n";
    $keys = preg_split("/ +/", preg_replace("/(:.*|\[|\])/", " ", $message), -1, PREG_SPLIT_NO_EMPTY);
    echo "Mine:\n";
    print_recursive_simple($b, $keys);
    exit();
  }
}