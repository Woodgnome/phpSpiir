<?php
class DB {
  private $host = "";
  private $user = "";
  private $password = "";
  private $database = "";
  private $persistent = false;
  private $printErrors = false;

  private $mysqli = NULL;

  private $result = false;
  private $maxAttempts = 0;
  private $waitTime = 3;
  
  private $sql;
  private $errorMessage;
  private $isConnected = false;

  // Constructor 
  function __construct($host, $user, $password, $database, $printErrors = false, $usePersistent = false){
    $this->host = $host;
    $this->user = $user;
    $this->password = $password;
    $this->database = $database;
    $this->printErrors = $printErrors;
    $this->usePersistent = $usePersistent;
    
    // Database connection isn't opened until an actual SQL query is executed
  }
  
  // Open MySQL-connection 
  private function open(){
    $host = $this->host;
    $user = $this->user;
    $password = $this->password;
    $database = $this->database;
    if ($this->usePersistent){
      $this->host = "p:" . $this->host;
    }
    
    $numAttempts = 0;
    $this->mysqli = @new mysqli($host, $user, $password, $database);
    while ($this->mysqli->connect_errno && $numAttempts < $this->maxAttempts){
      sleep($this->waitTime);
      $this->mysqli = @new mysqli($host, $user, $password, $database);
      $numAttempts++;
    }

    if ($this->mysqli->connect_errno){
      $this->error();
      return false;
    }
    else {
      $this->isConnected = true;
      $this->mysqli->set_charset("utf8");
      return true;
    }
  }

  // Close database connection 
  public function close(){
    if ($this->isConnected){
      $this->isConnected = false;
      return (@$this->mysqli->close());
    }
  }
  
  // Queries MySQL 
  public function query($sql){
    $this->sql = $sql;
    
    if (!$this->isConnected){
      $this->open();
    }
    
    if ($this->isConnected){
      $result = @$this->mysqli->query($sql);
      if (!$result){
        $this->error();
        return false;
      }
      else {
        return $result;
      }
    }
    else {
      $this->error();
      return false;
    }
  }

  // Queries MySQL - returns value of first column in first row
  public function singleQuery($sql){ return $this->cellQuery($sql); } // Alias
  public function cellQuery($sql){
    $this->sql = $sql;
    
    if (!$this->isConnected){
      $this->open();
    }
    
    if ($this->isConnected){
      $result = $this->query($sql);
      if ($result === false) return false;
  
      $numRows = $this->numRows($result);
      if ($numRows) $data = $result->fetch_assoc();
      if (is_resource($result)) $this->freeResult($result);
  
      if ($numRows && count($data)) return reset($data);
      else return false;
    }
    else {
      $this->error();
      return false;
    }
  }
  

  // Queries MySQL - returns first row in the set as an asscociative array
  public function rowQuery($sql){
    $this->sql = $sql;
    
    if (!$this->isConnected){
      $this->open();
    }
    
    if ($this->isConnected){
      $result = $this->query($sql);
      if ($result === false) return false;
  
      $numRows = $this->numRows($result);
      if ($numRows) $data = $result->fetch_assoc();
      if (is_resource($result)) $this->freeResult($result);
  
      if ($numRows) return $data;
      else return false;
    }
    else {
      $this->error();
      return false;
    }
  }

  // Queries MySQL - returns associative array of results 
  public function arrayQuery($sql){
    $this->sql = $sql;
    
    if (!$this->isConnected){
      $this->open();
    }
    
    if ($this->isConnected){
      $result = $this->query($sql);
      if ($result === false) return false;
      
      $data = array();
      $numRows = $this->numRows($result);
      if ($numRows){
        for ($i=0; $i<$numRows; $i++) $data[] = $result->fetch_assoc();
      }
      if (is_resource($result)) $this->freeResult($result);
      return $data;
    }
    else {
      $this->error();
      return false;
    }
  }

  public function escape($sql){
    if (!$this->isConnected){
      $this->open();
    }
    return $this->mysqli->escape_string($sql);
  }
  
  // Returns affected rows 
  public function affectedRows(){
    if ($this->isConnected) return $this->mysqli->affected_rows;
    else return false;
  }

  // Returns numbers of rows in query 
  private function numRows($result){
    if ($this->mysqli)
    return $result->num_rows;
  }

  // Returns last ID from query 
  public function getLastInsertID(){
    if ($this->isConnected) return $this->mysqli->insert_id;
    else return false;
  }
  
  // Alias of getLastInsertID() 
  public function getLastQueryID(){
    if ($this->isConnected) return $this->getLastInsertID();
    else return false;
  }

  // Frees result from query 
  private function freeResult($result){
    return @$result->free();
  }
  
  // Locks tables 
  function lock($table){
    if ($this->isConnected){
      if (is_array($table)){
        $this->query("LOCK TABLES " . implode(" WRITE, ", $table) . " WRITE\n");
      }
      else {
        $this->query("LOCK TABLES $table WRITE");
      }
    }
  }
  
  // Unlocks tables 
  function unlock(){
    if ($this->isConnected){
      $this->query("UNLOCK TABLES");
    }
  }
  
  // Returns array of table names 
  function getTables(){
    if ($this->isConnected){
      $tables = array();
      $data = $this->arrayQuery("SHOW TABLES");
      if ($data == false) return false;
      foreach ($data as $table) $tables[] = reset($table);
      return $tables;
    }
    else {
      return false;
    }
  }
 
  // Return SQL for last query 
  public function getLastQuery(){
    return $this->sql;
  }
  
  // Returns MySQL error 
  private function error($errorMessage = null){
    if (empty($errorMessage)){
      if ($this->mysqli->connect_error) $this->errorMessage = $this->mysqli->connect_error . " (error #" . $this->mysqli->connect_errno . ")\n";
      else $this->errorMessage = $this->mysqli->error . " (error #" . $this->mysqli->errno . ")\n";
    }
    else {
      $this->errorMessage = $errorMessage;
    }
    if ($this->printErrors) echo $this->errorMessage;
  }

  // Returns MySQL error number 
  private function errorno(){
    if ($this->mysqli->connect_errno) return $this->mysqli->connect_errno;
    else return $this->mysqli->errno;
  }
  
  // Returns error message 
  public function getErrorMessage(){
    return $this->errorMessage;
  }
  
  // Return connection status
  public function getIsConnected(){
    return $this->isConnected;
  }
}