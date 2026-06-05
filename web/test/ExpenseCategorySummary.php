<?php
require_once(__DIR__ . "/include.php");

header("Content-Type: text/plain");

$entries = [
  "12 months" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_12month.json",
    "query" => "_t=1777147443644",
  ],
  "12 months_forbrug" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_12month_Forbrug.json",
    "query" => "_t=1777147443644&categoryId=Consumption",
  ],
  "12 months_privatforbrug" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_12month_Privatforbrug.json",
    "query" => "_t=1777147443644&categoryId=17",
  ],
  "2026" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2026.json",
    "query" => "_t=1777147472772&startMonth=202601&endMonth=202612",
  ],
  "2025" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025.json",
    "query" => "_t=1777147513177&startMonth=202501&endMonth=202512",
  ],
  "2025_forbrug" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_Forbrug.json",
    "query" => "_t=1778002530010&categoryId=Consumption&startMonth=202501&endMonth=202512",
  ],
  "2025_regninger" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_Regninger.json",
    "query" => "_t=1778002530010&categoryId=Bill&startMonth=202501&endMonth=202512",
  ],
  "2025_bolig" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_Bolig.json",
    "query" => "_t=1778002530010&categoryId=12&startMonth=202501&endMonth=202512",
  ],
  "2025_transport" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_Transport.json",
    "query" => "_t=1778002530010&categoryId=13&startMonth=202501&endMonth=202512",
  ],
  "2025_husholdning" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_Husholdning.json",
    "query" => "_t=1778002530010&categoryId=14&startMonth=202501&endMonth=202512",
  ],
  "2025_ferie" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_Ferie.json",
    "query" => "_t=1778002530010&categoryId=15&startMonth=202501&endMonth=202512",
  ],
  "2025_andre_leveomk" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_AndreLeveomk.json",
    "query" => "_t=1778002530010&categoryId=16&startMonth=202501&endMonth=202512",
  ],
  "2025_privatforbrug" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_Privatforbrug.json",
    "query" => "_t=1778002530010&categoryId=17&startMonth=202501&endMonth=202512",
  ],
  "2025_diverse" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2025_Diverse.json",
    "query" => "_t=1778002530010&categoryId=18&startMonth=202501&endMonth=202512",
  ],
  "2024" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2024.json",
    "query" => "_t=1777148841385&startMonth=202401&endMonth=202412",
  ],
  "2023" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2023.json",
    "query" => "_t=1777148906314&startMonth=202301&endMonth=202312",
  ],
  "2022" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2022.json",
    "query" => "_t=1777148924866&startMonth=202201&endMonth=202212",
  ],
  "2021" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2021.json",
    "query" => "_t=1777147616588&startMonth=202101&endMonth=202112",
  ],
  "2021_långæld" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2021_LånOgGæld.json",
    "query" => "_t=1777147616588&categoryId=19&startMonth=202101&endMonth=202112",
  ],
  "2020" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2020.json",
    "query" => "_t=1777147607221&startMonth=202001&endMonth=202012",
  ],
  "2020_regninger" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2020_Regninger.json",
    "query" => "_t=1778002530010&categoryId=Bill&startMonth=202001&endMonth=202012",
  ],
  "2019" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2019.json",
    "query" => "_t=1777147598498&startMonth=201901&endMonth=201912",
  ],
  "2018" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2018.json",
    "query" => "_t=1777147598498&startMonth=201801&endMonth=201812",
  ],
  "2017" => [
    "json_path" => __DIR__ . "/../../archive/ExpenseCategorySummary_2017.json",
    "query" => "_t=1777147598498&startMonth=201701&endMonth=201712",
  ],
];
foreach ($entries as $key => $entry){
  $limit = 0.1;
  if ($key == "12 months"){
    $entry["query"] .= "&startMonth=" . date("Ym", strtotime("now -1 year")) . "&endMonth=" . date("Ym");
  }
  $a = json_decode(file_get_contents($entry["json_path"]), true);
  $b = json_decode(get_my_spiir_url($_ENV["SCHEME"] . "://" . $_ENV["HOST"] . "/Dashboard/GetExpenseCategorySummary.php?" . $entry["query"]), true);

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
    echo $_ENV["SCHEME"] . "://" . $_ENV["HOST"] . "/Dashboard/GetExpenseCategorySummary.php?" . $entry["query"] . "\n\n";
    echo "Theirs <--> Mine\n";
    echo $message. "\n\n";
    $keys = preg_split("/ +/", preg_replace("/(:.*|\[|\])/", " ", $message), -1, PREG_SPLIT_NO_EMPTY);
    echo "Mine:\n";
    print_recursive_simple($b, $keys);
    exit();
  }
}