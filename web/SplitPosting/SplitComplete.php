<?php
header("Location: " . (rawurldecode($_REQUEST["returnUrl"]) ?? "/poster"));
