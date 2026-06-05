<?php
require_once(__DIR__ . "/../lib/include.php");

$DB = $GLOBALS["DB"];

$db_categories = $DB->arrayQuery("SELECT * FROM categories ORDER BY sort");
$db_subcategories = $DB->arrayQuery("
  SELECT sc.*, c.type AS category_type FROM subcategories sc
  JOIN categories c ON sc.category_id = c.category_id
  ORDER BY subcategory_id
");
$db_countries = $DB->arrayQuery("SELECT * FROM countries");
$oldest_post = $DB->rowQuery("SELECT * FROM posts ORDER BY date ASC LIMIT 1");

function map_subcategories($subcategories, $hints = null, $tag = null, $value_prefix = null){
  return array_map(function($subcategory) use ($hints, $tag, $value_prefix){
    return [
      "label" => $subcategory["name"],
      "value" => (!empty($value_prefix) ? $value_prefix . "|" : "") . $subcategory["subcategory_id"],
      "aliases" => $hints !== null ? $hints : (!empty($subcategory["hints"]) ? explode(";", $subcategory["hints"]) : []),
      "tag" => $tag !== null ? $tag : ($subcategory["expense_type"] == "Fixed" ? "fixed" : ""),
      "selectable" => true,
    ];
  }, $subcategories);
}

function category_name($categories, $category_id){
  foreach ($categories as $category){
    if ($category_id == $category["category_id"]){
      return $category["name"];
    }
  }
  return null;
}

$category_options = array_column($db_categories, "category_id");
$last_upload = $_ENV["LAST_UPLOAD"]; // TODO
$consumption_posts_count = $_ENV["CONSUMPTION_POSTS_COUNT"]; // TODO
$consumption_posts_categorized_count = $_ENV["CONSUMPTION_POSTS_CATEGORIZED_COUNT"]; // TODO
$categorization_completion = $_ENV["CATEGORIZATION_COMPLETED"]; // TODO
$session = [
  "serverNotifications" => [],
  "userMessages" => [],
  "bankSyncDisabled" => NULL,
  "userId" => $_ENV["USER_ID"],
  "newTerms" => NULL,
  "countries" => array_map(function($country){ return [ "id" => $country["id"], "name" => $country["name"] ]; }, $db_countries),
  "categoryOptions" => array_map(function($category_id) use ($db_categories){
      return [
        "label" => category_name($db_categories, $category_id),
        "value" => strval($category_id),
        "selectable" => false,
        "submenu" => map_subcategories(get_categories($category_id), null, $category_id == 11 ? "income" : null),
      ];
    },
    $category_options
  ),
  "categories" => array_map(function($category){
      return [
        "id" => $category["category_id"],
        "name" => $category["name"],
        "categoryType" => $category["type"],
        "sortingPosition" => intval($category["sort"]),
      ];
    },
    $db_categories
  ),
  "subcategories" => array_map(function($subcategory){
      return [
        "id" => $subcategory["subcategory_id"],
        "name" => $subcategory["name"],
        "categoryId" => $subcategory["category_id"],
        "expenseType" => $subcategory["expense_type"],
        "categoryType" => $subcategory["category_type"],
        "hints" => $subcategory["hints"],
      ];
    },
    $db_subcategories
  ),
  "currency" => [
    "id" => "DKK",
    "symbol" => "kr",
    "shortFormat" => "{sign}{amount} {symbol}",
    "longFormat" => "{sign}{amount} {symbol}",
  ],
  "enableUnlicensedAis" => false,
  "enableEnterpriseAis" => true,
  "appInfo" => [
    "appName" => "Spiir",
    "legalName" => "Mastercard OB Services Europe A/S",
    "supportEmail" => "support@spiir.dk",
    "termsUrl" => "https://www.spiir.com/terms/user-terms",
    "privacyPolicyUrl" => "https://www.spiir.com/terms/privacy-policy",
    "websiteUrl" => "https://www.spiir.dk/",
    "helpUrl" => "https://help.spiir.dk/",
  ],
  "accountTypeOptions" => [
    [
      "label" => "Forbrug",
      "value" => "Consumption",
      "selectable" => true,
      "submenu" => NULL,
    ],
    [
      "label" => "Lån",
      "value" => "",
      "selectable" => false,
      "submenu" => map_subcategories(get_categories("Loan"), [], "", "Loan"),
    ],
    [
      "label" => "Låst opsparing",
      "value" => "",
      "selectable" => false,
      "submenu" => map_subcategories(get_categories("Locked savings"), [], "", "Savings"),
    ],
  ],
  "htmlClass" => NULL,
  "title" => NULL,
  "openGraphTitle" => NULL,
  "description" => NULL,
  "user" => [
    "oldestPosting" => timestring(strtotime($oldest_post["date_custom"] ?? $oldest_post["date"])),
    "hasPostings" => !empty($oldest_post),
    "showExcludedPostings" => true, // TODO
    "joyRideSteps" => [
      "deletecards" => 1,
      "spiirtreats" => 2,
      "spiirchallenges" => 1,
      "primarychallenge" => 1,
      "budgetPageJoyRide" => 3,
      "welcomeToSpiirJoyRide" => 2,
      "automaticSynchronization" => 2,
      "aonInsuranceUpsellJoyRide" => 1,
      "aonInsuranceCampaignJoyRide" => 1,
    ],
    "categorizationCompletion" => $categorization_completion,
    "name" => NULL,
    "email" => $_ENV["EMAIL"],
    "lastUpload" => $last_upload,
    "consumptionPostingsCount" => $consumption_posts_count,
    "consumptionPostingsCategorized" => $consumption_posts_categorized_count,
    "emailVerified" => false,
    "emailVerificationRequired" => false,
    "documentCount" => 0,
    "documentsEnabled" => false,
    "twoFactorEnabled" => false,
    "legalRegion" => "EEA",
    "languageCode" => "da",
  ],
  "authenticated" => NULL,
];
?>
<!doctype html>
<html class="appLayout" lang="da">
<head>
    <meta charset="utf-8" />
    <title>Spiir</title>
    <link href="/Content/Css/SpiirApplication.css?v=cA9z2Jk3xgOQExJ_mMgPaceqF-k" rel="stylesheet" type="text/css" media="screen,print,projection" />

    <meta name="apple-mobile-web-app-capable" content="yes" />



    <script src="/Client/lib/require.js?v=S7R5MCkoHo6F5XZtf7bfQiaQioo"></script>

    <script type="text/javascript">
        require.config({"urlArgs":"","baseUrl":"/Client","waitSeconds":20,"paths":{"config":"/config.5326009960","oldScripts":"/Content/Scripts"}});
        requirejs.onError = function(err) {
            if (err.requireType === 'timeout') {
                document.getElementById('requireJsError').style.display = 'block';

                if (window.jQuery) {
                    jQuery.post('/ClientError/Log', { message: 'Require JS Timeout (Client).\nModules: ' + err.requireModules, url: location.href });
                }
            }
        };
        define('session', [], <?php echo json_encode($session); ?>);
        require(['/Client/init.js']);
    </script>
</head>
<body>
    <div class="page">
        <nav class="mainNavigation"></nav>
        <div class="topPanel">
            <div class="menuWrapper">
                <div class="menu">
                    <div class="topBar"></div>
                </div>
            </div>
        </div>
        <div class="content">
            <div class="main">
            </div>
        </div>
    </div>
    <div id="requireJsError" style="display: none; margin-left: 150px;">
        <h1>Øv... der opstod en fejl!</h1>
        <p>Der opstod en fejl ved applikationens start.</p>
        <p><a href="#" onclick="location.reload(); return false;">Genindlæs siden</a>, eller prøv at trykke Ctrl+R eller Ctrl+F5 for at genstarte applikationen.</p>
        <p>Hvis det ikke virker, kan du <a href="mailto:support@spiir.dk">kontakte support</a>.</p>
    </div>

    <svg xmlns="http://www.w3.org/2000/svg" style="height: 0; width: 0; position: absolute; visibility: hidden">
    <symbol id="icon-overview" viewBox="0 0 33 33">
        <title>Overblik</title>
        <path d="M4.22 19.125c-.88 0-1.588-.7-1.588-1.56 0-.857.708-1.558 1.587-1.558.882 0 1.59.7 1.59 1.558 0 .86-.708 1.56-1.59 1.56zm0-5.118c-1.98 0-3.588 1.59-3.588 3.56 0 1.967 1.608 3.558 3.587 3.558 1.98 0 3.59-1.59 3.59-3.56 0-1.967-1.61-3.558-3.59-3.558zM13.557 30.497c-.88 0-1.59-.7-1.59-1.56 0-.858.71-1.558 1.59-1.558.88 0 1.59.7 1.59 1.558 0 .86-.71 1.56-1.59 1.56zm0-5.118c-1.98 0-3.59 1.59-3.59 3.558 0 1.97 1.61 3.56 3.59 3.56 1.98 0 3.59-1.59 3.59-3.56s-1.61-3.56-3.59-3.56zM19.677 6.116c-.88 0-1.59-.7-1.59-1.558 0-.858.71-1.558 1.59-1.558.88 0 1.59.7 1.59 1.558 0 .858-.71 1.558-1.59 1.558zm0-5.116c-1.98 0-3.59 1.59-3.59 3.558 0 1.968 1.61 3.558 3.59 3.558 1.98 0 3.59-1.59 3.59-3.558 0-1.968-1.61-3.558-3.59-3.558zM29.408 20.617c-.878 0-1.587-.7-1.587-1.558 0-.858.71-1.56 1.588-1.56.882 0 1.592.7 1.592 1.56 0 .857-.71 1.558-1.592 1.558zm0-5.116c-1.978 0-3.587 1.592-3.587 3.56 0 1.967 1.61 3.558 3.588 3.558 1.98 0 3.592-1.59 3.592-3.56 0-1.967-1.61-3.557-3.592-3.557z" />
        <path d="M10.85 27.834c.338.437.965.518 1.403.18.437-.336.52-.964.18-1.4l-5.47-7.1c-.337-.436-.965-.518-1.402-.18-.437.337-.518.965-.18 1.402l5.47 7.098zm9.45-20.49c.125-.54-.21-1.077-.748-1.202s-1.075.21-1.2.748l-4.48 19.263c-.125.538.21 1.075.748 1.2.537.125 1.075-.21 1.2-.747L20.3 7.343zm6.556 10.332c.294.468.91.608 1.38.314.466-.294.607-.91.313-1.38L22.242 6.585c-.294-.468-.912-.608-1.38-.314-.467.294-.607.91-.313 1.38l6.306 10.026z" />
    </symbol>

    <symbol id="icon-insurance" viewBox="0 0 33 33">
        <title>Forsikring</title>
        <path d="M16 30C8.268 30 2 23.73 2 16 2 8.264 8.266 2 16 2c7.733 0 14 6.265 14 14 0 7.73-6.268 14-14 14zm0-30C7.162 0 0 7.16 0 16c0 8.836 7.163 16 16 16s16-7.165 16-16c0-8.84-7.162-16-16-16z" />
        <path d="M16 23.888c-4.355 0-7.888-3.535-7.888-7.89 0-4.355 3.53-7.885 7.888-7.885 4.355 0 7.885 3.53 7.885 7.886 0 4.354-3.532 7.888-7.885 7.888zM25.043 12C23.906 9.43 21.706 7.437 19 6.576v-5.32c0-.552-.448-1-1-1s-1 .448-1 1v4.907c-.33-.033-.662-.05-1-.05-.685 0-1.354.07-2 .202v-5.06c0-.55-.448-1-1-1s-1 .45-1 1v5.7C9.754 7.95 7.948 9.755 6.954 12H1.237c-.552 0-1 .448-1 1s.448 1 1 1h5.077c-.133.646-.202 1.314-.202 2 0 .337.017.67.05 1H1.237c-.552 0-1 .448-1 1s.448 1 1 1h5.34c.86 2.705 2.854 4.906 5.423 6.045v5.74c0 .55.448 1 1 1s1-.45 1-1v-5.1c.646.133 1.315.203 2 .203.338 0 .67-.017 1-.05v4.946c0 .552.448 1 1 1s1-.448 1-1v-5.36c3.046-.97 5.452-3.377 6.42-6.424h5.342c.553 0 1-.448 1-1s-.447-1-1-1h-4.927c.033-.33.05-.663.05-1 0-.686-.07-1.354-.202-2h5.08c.552 0 1-.448 1-1s-.448-1-1-1h-5.72z" />
        <path d="M16 30C8.268 30 2 23.73 2 16 2 8.264 8.266 2 16 2c7.733 0 14 6.265 14 14 0 7.73-6.268 14-14 14zm0-30C7.162 0 0 7.16 0 16c0 8.836 7.163 16 16 16s16-7.165 16-16c0-8.84-7.162-16-16-16z" />
    </symbol>

    <symbol id="icon-budget" viewBox="0 0 33 33">
        <desc>Budget</desc>
        <g transform="translate(0, 5)">
            <path d="M22.4976391,10.6076144 C25.0578299,13.1678052 25.4841539,17.1372375 23.5967648,20.1862806 C23.3525251,20.5808454 23.4118105,21.0915922 23.7399373,21.419719 L28.2654207,25.9452024 C28.6931534,26.3729351 29.3997497,26.3259337 29.7670607,25.8453163 C34.6300245,19.4822487 34.0738519,10.4476224 28.3657415,4.73951201 C22.0877493,-1.53848019 11.9108526,-1.53731436 5.63270043,4.74083783 C-0.0755167844,10.4490551 -0.633210769,19.4818899 4.2282235,25.8443486 C4.59550954,26.3250384 5.30216495,26.3720812 5.72992762,25.9443186 L10.2549691,21.4192771 C10.583027,21.0912192 10.6423644,20.580606 10.3982789,20.1860604 C8.51182483,17.136751 8.93789684,13.165659 11.4977092,10.6058466 C14.5353303,7.56822558 19.4595823,7.56955761 22.4976391,10.6076144 Z M8.6974457,21.2382802 L8.84075551,20.0050635 L4.31571405,24.530105 L5.81741817,24.630075 C1.5619166,19.0606378 2.05021737,11.151748 7.046914,6.1550514 C12.5440901,0.657875266 21.4546569,0.656854495 26.9515279,6.15372557 C31.9479831,11.1501807 32.4349582,19.0607432 28.1779943,24.630875 L29.6796343,24.5309889 L25.1541509,20.0055055 L25.2973235,21.2389439 C27.6695005,17.4067347 27.1333708,12.414919 23.9118527,9.19340085 C20.0929185,5.37446668 13.9023366,5.37279211 10.0834957,9.19163308 C6.86235194,12.4127768 6.32661127,17.4060068 8.6974457,21.2382802 Z"></path>
            <g transform="translate(19.136763, 13.053096) rotate(20) translate(-19.136763, -13.053096) translate(16.136763, 3.553096)">
                <path d="M3.02606043,18.2286168 C4.35681204,18.2286168 5.43559936,17.1498295 5.43559936,15.8190779 C5.43559936,14.4883263 4.35681209,0.179115555 3.02606048,0.179115555 C1.69530888,0.179115555 0.616521499,14.4883263 0.616521499,15.8190779 C0.616521499,17.1498295 1.69530882,18.2286168 3.02606043,18.2286168 Z M3.02606043,16.8190779 C3.57834518,16.8190779 4.02606043,16.3713626 4.02606043,15.8190779 C4.02606043,15.2667931 3.57834518,14.8190779 3.02606043,14.8190779 C2.47377568,14.8190779 2.02606043,15.2667931 2.02606043,15.8190779 C2.02606043,16.3713626 2.47377568,16.8190779 3.02606043,16.8190779 Z"></path>
            </g>
        </g>
    </symbol>

    <symbol id="icon-documents" viewBox="0 0 33 33">
        <title>Bilag</title>
        <path d="M21.108 21.884h-1v4.42c0-.005-8.228-.01-8.228-.01.006 0 .012-3.41.012-3.41v-1H1v2h9.892l-1-1v3.42c0 1.1.89 1.99 1.988 1.99h8.24c1.098 0 1.988-.89 1.988-1.99v-3.42l-1 1H31v-2h-9.892z" />
        <path d="M30.01 10.01c-.005 0-.01 19.953-.01 19.953 0-.007-28.01-.013-28.01-.013.004 0 .01-19.952.01-19.952 0 .005 2.954.01 2.954.01v-2H1.99C.89 8.01 0 8.9 0 10v19.965c0 1.1.89 1.987 1.99 1.987h28.02c1.098 0 1.99-.888 1.99-1.987V9.998c0-1.1-.89-1.99-1.99-1.99h-3.222v2h3.222z" />
        <path d="M6.062 2.04c0 .005 19.844.01 19.844.01-.006 0-.01 20.935-.01 20.935h2V2.04c0-1.1-.892-1.99-1.99-1.99H6.05c-1.097 0-1.988.89-1.988 1.99v20.945h2V2.04z" />
        <path d="M21.517 7V5H10.224v2M21.517 12v-2H10.224v2M21.517 17v-2H10.224v2" />
    </symbol>

    <symbol id="icon-posting" viewBox="0 0 33 33">
        <title>Poster</title>
        <path d="M1.85 7H30.15C30.067 7 30 6.933 30 6.85v18.82c0-.084.067-.152.152-.152H1.85c.082 0 .15.068.15.15V6.85c0 .083-.068.15-.15.15zM0 25.67c0 1.02.827 1.848 1.85 1.848H30.15c1.02 0 1.848-.828 1.848-1.85V6.85C32 5.83 31.172 5 30.152 5H1.85C.826 5 0 5.828 0 6.85v18.82z" />
        <path d="M1 11v4h30v-4" />
    </symbol>

    <symbol id="icon-account" viewBox="0 0 33 33">
        <title>Konti</title>
        <path d="M27.016 27.08H4.98C3.347 27.08 2 25.734 2 24.098V4.98C2 3.346 3.345 2 4.98 2h22.036C28.656 2 30 3.343 30 4.98V24.1c0 1.638-1.345 2.982-2.984 2.982zm-2.016 2h2.016c2.743 0 4.984-2.24 4.984-4.982V4.98C32 2.24 29.76 0 27.016 0H4.98C2.24 0 0 2.24 0 4.98V24.1c0 2.74 2.24 4.982 4.98 4.982H6v1.33c0 .553.448 1 1 1s1-.447 1-1v-1.33h15v1.33c0 .553.448 1 1 1s1-.447 1-1v-1.33z" />
        <path d="M24.03 16.05c-.834 0-1.51-.676-1.51-1.51 0-.837.675-1.512 1.51-1.512.837 0 1.513.676 1.513 1.512 0 .834-.677 1.51-1.512 1.51zm0-5.022c-1.94 0-3.51 1.57-3.51 3.512 0 1.94 1.57 3.51 3.51 3.51 1.94 0 3.513-1.572 3.513-3.51 0-1.94-1.572-3.512-3.512-3.512zM5 11.596c0 .552.448 1 1 1s1-.448 1-1v-6.13c0-.552-.448-1-1-1s-1 .448-1 1v6.13zm0 12.017c0 .553.448 1 1 1s1-.447 1-1v-6.13c0-.552-.448-1-1-1s-1 .448-1 1v6.13z" />
    </symbol>
</svg>

</body>
</html>