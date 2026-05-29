<?php
echo file_get_contents(realpath(__DIR__ . $_SERVER["REQUEST_URI"] . ".js"));
