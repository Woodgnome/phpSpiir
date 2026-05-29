<?php

function import($table, $sub_tables, $data, $floats, $keys){
  $DB = $GLOBALS["DB"];

  $table_columns = $DB->arrayQuery("DESCRIBE $table");

  // Load data
  if (is_string($data)){
    $json = file_get_contents($data);
    if ($json[0] == "\xEF" && $json[1] == "\xBB" && $json[2] == "\xBF"){ // UTF-8 BOM
      $json = substr($json, 3);
    }
    $items = json_decode($json);
  }
  else {
    $items = $data;
  }

  // Generate insert SQL
  $DB->query("SET FOREIGN_KEY_CHECKS = 0");
  $DB->query("TRUNCATE $table");
  $DB->query("SET FOREIGN_KEY_CHECKS = 1");
  $columns = array_filter($table_columns, function($table_column) use ($keys){
    if (array_key_exists($table_column["Field"], $keys) && $keys[$table_column["Field"]] === null){ // Table column with no item property
      return false;
    }
    return true;
  });
  $sql = "INSERT INTO $table (" . implode(", ", array_column($columns, "Field")) . ") VALUES ";

  // Parse values and insert
  $values = [];
  foreach ($items as $item){
    $item_values = [];
    foreach ($table_columns as $table_column){
      if (array_key_exists($table_column["Field"], $keys) && $keys[$table_column["Field"]] === null){
        continue;
      }
      $item_values[] = get_value($table_column, $item, $floats, $keys);
    }
    $values[] = "(" . implode(", ", $item_values) . ")";
    if (count($values) >= 1000){
      $DB->query($sql . implode(", ", $values));
      $values = [];
    }
  }
  if (!empty($values)){
    $DB->query($sql . implode(", ", $values));
  }

  // Sub tables
  foreach ($sub_tables as $sub_table){
    $data = [];
    foreach ($items as $item){
      if (is_array($item->{$sub_table["property"]})){
        $subdata = $item->{$sub_table["property"]};
        if (!empty($subdata)){
          foreach ($sub_table["keys"] as $key){
            if (is_array($key)){
              $parent_id = $DB->cellQuery($sql = "
                SELECT " . $key["parent_id_column"] . " FROM $table
                WHERE " . $key["parent_match_column"] . " = '" . $DB->escape($item->{$key["parent_match_key"]}) . "'
              ");
              foreach ($subdata as $index => $sd){
                $subdata[$index]->{snake_to_camel_case($key["sub_key"])} = $parent_id;
              }
            }
          }
        }
        $data = array_merge($data, $subdata);
      }
      else {
        $data[] = $item->{$sub_table["property"]};
      }
    }
    import($sub_table["table"], [], $data, $sub_table["floats"], $sub_table["keys"]);
  }
}

function get_value($table_column, $item, $floats, $keys){
  $DB = $GLOBALS["DB"];

  $key = $table_column["Field"];
  if (isset($keys[$key])){
    if (is_array($keys[$key])){
      $key = $keys[$key]["sub_key"];
    }
    else {
      $key = $keys[$key];
    }
  }
  $camel_key = snake_to_camel_case($key);
  if (!property_exists($item, $camel_key)){
    $pascal_key = snake_to_pascal_case($key);
    if (!property_exists($item, $pascal_key)){
      throw new Exception("Key not found: $key $camel_key $pascal_key\n" . print_r($item, true));
    }
    $key = $pascal_key;
  }
  else {
    $key = $camel_key;
  }
  $value = $item->{$key};

  // Nullable
  if ($table_column["Null"] == "YES"
      && (!in_array($key, [ "Comment" ]) && empty($value) || $value === null) // Ensure specific empty strings are not converted to null
      && $value !== 0){
    return "NULL";
  }

  // Arrays
  if (is_array($value)){
    return "'" . $DB->escape(implode(";", $value)) . "'";
  }

  switch ($table_column["Type"]){
    case "tinyint(4)":
      return $value ? 1 : 0;
    
    case "int(11)":    
    case "bigint(20)":
      if (in_array($key, $floats)){
        if (!preg_match("/^-?\d+(\.\d{1,2})?$/", $value)){
          echo "Float more than 2 decimals '$key' $value\n";
          exit();
        }
        return intval(floatval($value) * 100);
      }
      return intval($value);
    
    case "varchar(2)":
    case "varchar(255)":
      return "'" . $DB->escape($value) . "'";
    
    case "datetime":
      return "FROM_UNIXTIME(" . strtotime($value) . ")";
    
    default:
      echo "Unknown field " . $table_column["Type"] . "\n";
      exit();
  }
}

function snake_to_camel_case($key){
  return preg_replace_callback("/_(.)/u", function($matches){ return mb_strtoupper($matches[1]); }, $key);
}

function snake_to_pascal_case($key){
  $key = preg_replace_callback("/_(.)/u", function($matches){ return mb_strtoupper($matches[1]); }, $key);
  return ucfirst($key);
}
