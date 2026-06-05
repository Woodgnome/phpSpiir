<?php
require_once(__DIR__ . "/../../lib/include.php");

header("Content-Type: application/json");

$DB = $GLOBALS["DB"];

$db_banks = $DB->arrayQuery("SELECT * FROM banks");
$db_bank_credentials = $DB->arrayQuery("SELECT * FROM bank_credentials");
$banks = array_map(function($db_bank) use ($db_bank_credentials){
  return [
    "id" => $db_bank["id"],
    "name" => $db_bank["name"],
    "countryCode" => $db_bank["country_code"],
    "isPartnerBank" => !empty($db_bank["is_parter_bank"]),
    "hasLogo" => !empty($db_bank["has_logo"]),
    "active" => !empty($db_bank["active"]),
    "mobileBankApiEnabled" => !empty($db_bank["mobile_bank_api_enabled"]),
    "markAsBeta" => !empty($db_bank["mark_as_beta"]),
    "bankCredentials" => array_map(
      function($db_bank_credential){
        return [
          "id" => $db_bank_credential["id"],
          "displayName" => $db_bank_credential["display_name"],
          "supportsUnattended" => !empty($db_bank_credential["supports_unattended"]),
          "isDisabled" => !empty($db_bank_credential["is_disabled"]),
        ];
      },
      array_filter($db_bank_credentials, function($db_bank_credential) use ($db_bank){
        return $db_bank["bank_id"] == $db_bank_credential["bank_id"];
      })
    ),
    "isAutomatic" => !empty($db_bank["is_automatic"]),
    "bankApiDisabledMesssage" => $db_bank["bank_api_disabled_message"],
    "disableManualUpload" => !empty($db_bank["disable_manual_upload"]),
    "csvSupported" => !empty($db_bank["csv_supported"]),
    "searchHints" => $db_bank["search_hints"] !== null ? explode(";", $db_bank["search_hints"]) : null,
    "helpUrl" => $db_bank["help_url"],
  ];
}, $db_banks);
echo json_encode($banks);
