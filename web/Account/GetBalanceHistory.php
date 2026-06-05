<?php
require_once(__DIR__ . "/../../lib/include.php");

header("Content-Type: application/json");

$DB = $GLOBALS["DB"];

// Validate request
$request_valid = false;
if (!empty($_REQUEST["accountGroupId"])){
  $request_valid = !empty($DB->cellQuery("SELECT COUNT(*) FROM accounts WHERE account_id = " . intval($_REQUEST["accountGroupId"])));
}

if ($request_valid){
  $account_id = intval($_REQUEST["accountGroupId"]);
  $db_balances = $DB->arrayQuery("
    SELECT p.* FROM posts p
    JOIN account_periods ap ON p.account_period_id = ap.account_period_id
    JOIN accounts a ON ap.account_id = a.account_id
    WHERE a.account_id = " . $account_id . "
      AND (split_group_id IS NULL OR split_group_id = post_id) # Skip sub post of splits
    ORDER BY date DESC, post_id ASC
  ");
  $balance_history = [];

  // Manual grouping because MySQL grouping is random
  foreach ($db_balances as $db_balance){
    if ($db_balance["balance"] !== null || !isset($balance_history[$db_balance["date"]])){
      $balance_history[$db_balance["date"]] = [
        "balance" => intval($db_balance["balance"]) / 100,
        "date" => timestring(strtotime($db_balance["date"])),
      ];
    }
  }
  $balance_history = array_values($balance_history);
  $balance_history = array_slice($balance_history, 0, 1000);

  // Set lastest balance to 0 if account is inactive
  if (!empty($balance_history) && !empty($DB->cellQuery("SELECT inactive FROM accounts WHERE account_id = " . $account_id))){
    $balance_history[0]["balance"] = 0;
  }

  echo json_encode($balance_history, JSON_PRETTY_PRINT);
}
else {
  http_response_code(400);
}
