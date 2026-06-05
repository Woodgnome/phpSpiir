<?php
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$entries = [
  "initial" => [
    "json_path" => __DIR__ . "/../../archive/Postings.json",
    "query" => "_t=1777147443644",
  ],
  "startAt50" => [
    "json_path" => __DIR__ . "/../../archive/Postings_startAt50.json",
    "query" => "_t=1777147443644&startAt=50",
  ],
  "startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_startAt1000.json",
    "query" => "_t=1777147443644&startAt=1000",
  ],
  "sortDate" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortDate.json",
    "query" => "_t=1777147443644&sorting=Date",
  ],
  "sortDate_startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortDate_startAt1000.json",
    "query" => "_t=1777147443644&sorting=Date&startAt=1000",
  ],
  "sortDateDesc" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortDateDesc.json",
    "query" => "_t=1777147443644&sorting=Date&sortDescending=true",
  ],
  "sortDateDesc_startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortDateDesc_startAt1000.json",
    "query" => "_t=1777147443644&sorting=Date&sortDescending=true&startAt=1000",
  ],
  "sortCategory" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortCategory.json",
    "query" => "_t=1777147443644&sorting=Category",
  ],
  "sortCategory_startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortCategory_startAt1000.json",
    "query" => "_t=1777147443644&sorting=Category&startAt=1000",
  ],
  "sortCategoryDesc" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortCategoryDesc.json",
    "query" => "_t=1777147443644&sorting=Category&sortDescending=true",
  ],
  "sortCategoryDesc_startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortCategoryDesc_startAt1000.json",
    "query" => "_t=1777147443644&sorting=Category&sortDescending=true&startAt=1000",
  ],
  "sortAmount" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortAmount.json",
    "query" => "_t=1777147443644&sorting=Amount",
  ],
  "sortAmount_startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortAmount_startAt1000.json",
    "query" => "_t=1777147443644&sorting=Amount&startAt=1000",
  ],
  "sortAmountDesc" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortAmountDesc.json",
    "query" => "_t=1777147443644&sorting=Amount&sortDescending=true",
  ],
  "sortAmountDesc_startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortAmountDesc_startAt1000.json",
    "query" => "_t=1777147443644&sorting=Amount&sortDescending=true&startAt=1000",
  ],
  "sortDescription" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortDescription.json",
    "query" => "_t=1777147443644&sorting=Description",
  ],
  "sortDescription_startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortDescription_startAt1000.json",
    "query" => "_t=1777147443644&sorting=Description&startAt=1000",
  ],
  "sortDescriptionDesc" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortDescriptionDesc.json",
    "query" => "_t=1777147443644&sorting=Description&sortDescending=true",
  ],
  "sortDescriptionDesc_startAt1000" => [
    "json_path" => __DIR__ . "/../../archive/Postings_sortDescriptionDesc_startAt1000.json",
    "query" => "_t=1777147443644&sorting=Description&sortDescending=true&startAt=1000",
  ],
  "202001_202012" => [
    "json_path" => __DIR__ . "/../../archive/Postings_202001_202012.json",
    "query" => "_t=1777147443644&fromMonth=202001&toMonth=202005",
  ],
  "2020W1_2020W52" => [
    "json_path" => __DIR__ . "/../../archive/Postings_2020W1_2020W52.json",
    "query" => "_t=1777147443644&fromWeek=2020W01&toWeek=2020W52",
  ],
];
foreach ($entries as $key => $entry){
  $a = json_decode(file_get_contents($entry["json_path"]), true);
  $b = json_decode(get_my_spiir_url($_ENV["SCHEME"] . "://" . $_ENV["HOST"] . "/Posting/GetPostings.php?" . $entry["query"]), true);

  echo $key . "\n";
  echo "========================================================================================================================\n\n";
  try {
    $items_ignored = compare_recursive($a, $b, [ "isSubcategoryLocked" ]);
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
    echo $_ENV["SCHEME"] . "://" . $_ENV["HOST"] . "/Posting/GetPostings.php?" . $entry["query"] . "\n\n";
    echo "Theirs <--> Mine\n";
    echo $message. "\n\n";
    $keys = preg_split("/ +/", preg_replace("/(:.*|\[|\])/", " ", $message), -1, PREG_SPLIT_NO_EMPTY);
    echo "Mine:\n";
    print_recursive_simple($b, $keys);
    exit();
  }
}