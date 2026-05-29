<?php
require_once(__DIR__ . "/../../vendor/autoload.php");
define("NUMBER_MAX_DIFF", 0.1);

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

function stringify($value){
  $type = gettype($value);
  switch ($type){
    case "string":
      return '"' . $value . '"';
    
    case "boolean":
      return $value ? "true" : "false";
    
    case "NULL":
      return "NULL";
    
    case "array":
      return "[ ... ]";
    
    default:
      return strval($value);
  }
}

/**
 * compare_recursive()
 */
function compare_recursive($a, $b, $ignore_keys = [], $ancestor_keys = [], $number_max_diff = NUMBER_MAX_DIFF){
  $items_ignored = [];
  $parent_key = end($ancestor_keys);
  try {
    $type = gettype($a);
    if ($type != gettype($b)){ 
      if ($a !== $b
          && !($a === "" && $b === NULL) && !($a === NULL && $b === "") // Ignore empty string / NULL type mismatch
          && !(is_numeric($a) && is_numeric($b))) // Ignore double/integer type mismatch
      {
        throw new Exception(": Type mismatch '$type' <> '" . gettype($b) . "'");
      }    
    }

    switch ($type){
      case "boolean":
        if ($a !== $b){
          throw new Exception(": " . stringify($a) . " != " . stringify($b));
        }
        break;

      case "string":
        if ($a != $b){
          throw new Exception(": '$a' != '$b'");
        }
        break;
      
      case "integer":
      case "double":
        if (abs($a - $b) > $number_max_diff){
          throw new Exception(": $a != $b (" . abs($a - $b) . ")");
        }
        break;
      
      case "NULL":
        break;
      
      case "array":
        break;
      
      case "object":
        throw new Exception(": Object not supported.");

      default:
        // "resource"
        // "resource (closed)"
        // "unknown type"
        throw new Exception(": Unknown type '$type'.");
    }
  }
  catch (Exception $ex){
    if (in_array($parent_key, $ignore_keys)){
      $items_ignored[] = [ $ancestor_keys, $a, $b ];
    }
    else {
      throw $ex;
    }
  }

  if ($type == "array"){
    $keys_a = array_keys($a);
    $keys_b = array_keys($b);
    foreach ($keys_a as $index => $key){
      if (!in_array($key, $keys_b)){
        throw new Exception("[$key]: -Missing- (b)");
      }
      if (!isset($keys_b[$index]) || $keys_b[$index] != $key){
        throw new Exception("[$key]: -Wrong position- (b)");
      }
    }
    foreach ($keys_b as $index => $key){
      if (!in_array($key, $keys_a)){
        throw new Exception("[$key]: -Missing- (a)");
      }
      if (!isset($keys_a[$index]) || $keys_a[$index] != $key){
        throw new Exception("[$key]: -Wrong position- (a)");
      }
    }
    $keys = array_unique(array_merge($keys_a, $keys_b));
    foreach ($keys as $key){
      try {
        $num_max_diff = $number_max_diff * ($parent_key == "postingStatistics" && in_array($key, [ "average", "total" ]) ? 40 : 1);
        $items_ignored = array_merge($items_ignored, compare_recursive($a[$key], $b[$key], $ignore_keys, [...$ancestor_keys, $key], $num_max_diff));
      }
      catch (Exception $ex){
        throw new Exception("[$key]" . $ex->getMessage());
      }
    }
  }

  return $items_ignored;
}

/**
 * print_recursive_simple()
 */
function print_recursive_simple($data, $keys, $level = 0){
  $pads = 4;
  $pad = str_pad("", $level * $pads);
  $pad_next = str_pad("", ($level + 1) * $pads);

  $first_key = reset($keys);
  if (gettype($data) == "array"){
    echo "[\n";
    foreach ($data as $key => $value){
      if ($key == $first_key && is_array($data[$key])){
        echo $pad_next . stringify($key) . " => ";
        print_recursive_simple($value, array_slice($keys, 1), $level + 1);
      }
      else {
        echo $pad_next . stringify($key) . " => ";
        echo stringify($value) . ",\n";
      }
    }
    echo $pad . "],\n";
  }
  else {
    echo gettype($data[$first_key]) . " " . stringify($data[$first_key]) . ",\n";
  }
}

/**
 * get_my_spiir_url()
 */
function get_my_spiir_url($url){
  $context = stream_context_create([
    "http" => [
      "header" => $_ENV["HEADER"],
    ],
  ]);
  return file_get_contents($url, false, $context );
}
