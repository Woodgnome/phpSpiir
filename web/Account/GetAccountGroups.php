<?php
require_once(__DIR__ . "/../../lib/include.php");

header("Content-Type: application/json");

$DB = $GLOBALS["DB"];

// No idea what the ordering is supposed to be here
$db_accounts = $DB->arrayQuery("
  SELECT
    a.*,
    COUNT(*) number_of_postings
  FROM accounts a
  JOIN account_periods ap ON a.account_id = ap.account_id
  JOIN posts p ON ap.account_period_id = p.account_period_id
  GROUP BY a.account_id
");
$db_account_periods = $DB->arrayQuery("
  SELECT
    ap.*,
    COUNT(*) posting_count,
    SUM(CASE WHEN p.subcategory_id = 102 THEN 1 ELSE 0 END) ignored_posting_count
  FROM account_periods ap
  JOIN posts p ON ap.account_period_id = p.account_period_id
  GROUP BY ap.account_period_id
");
$accounts = array_map(function($db_account) use ($db_account_periods){
  return [
    "id" => $db_account["account_id"],
    "name" => $db_account["name"],
    "accountType" => $db_account["type"],
    "accountSubcategoryId" => $db_account["subcategory_id"],
    "accountTypeExplicitlySet" => !empty($db_account["type_explicitly_set"]),
    "bankCredentialId" => $db_account["bank_credential_id"],
    "balance" => $db_account["balance"] !== null ? $db_account["balance"] / 100 : null,
    "availableBalance" => $db_account["available_balance"] != null ? $db_account["available_balance"] / 100 : null,
    "startDate" => timestring(strtotime($db_account["start_date"])),
    "endDate" => timestring(strtotime($db_account["end_date"])),
    "periods" => array_values(array_map(
      function($db_account_period){
        return [
          "accountId" => $db_account_period["account_period_id"],
          "postingCount" => $db_account_period["posting_count"],
          "ignorePostingsBefore" => $db_account_period["ignore_postings_before"] !== null ? timestring(strtotime($db_account_period["ignore_postings_before"])) : null,
          "ignorePostingsAfter" => $db_account_period["ignore_postings_after"] !== null ? timestring(strtotime($db_account_period["ignore_postings_after"])) : null,
          "ignoredPostingCount" => $db_account_period["ignored_posting_count"],
          "startDate" => timestring(strtotime($db_account_period["start_date"])),
          "endDate" => timestring(strtotime($db_account_period["end_date"])),
          "startBalance" => $db_account_period["start_balance"] / 100,
          "endBalance" => $db_account_period["end_balance"] / 100,
          "isAutomatic" => !empty($db_account_period["is_automatic"]),
        ];
      },
      array_filter($db_account_periods, function($db_account_period) use ($db_account){
        return $db_account["account_id"] == $db_account_period["account_id"];
      })
    )),
    "numberOfPostings" => $db_account["number_of_postings"],
    "isAutomatic" => !empty($db_account["is_automatic"]),
    "bankId" => $db_account["bank_id"],
    "bankName" => $db_account["bank_name"],
    "partnerId" => $db_account["partner_id"],
    "inActive" => !empty($db_account["inactive"]),
    "inActiveBySystem" => !empty($db_account["inactive_by_system"]),
    "ownerUserId" => $db_account["owner_user_id"],
    "connectionType" => $db_account["connection_type"],
    "lastUpdated" => timestring(strtotime($db_account["last_updated"])),
  ];
}, $db_accounts);
echo json_encode($accounts);
