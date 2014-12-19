<?php
header('Content-type: application/json');
$request = urldecode($_GET['r']);

$response = file_get_contents($request);

echo $response;