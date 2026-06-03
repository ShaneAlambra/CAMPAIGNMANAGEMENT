<?php
/**
 * Bootstrap — single include that every endpoint pulls in.
 * Loads config + core helpers and sets up CORS / error handling.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');           // never leak PHP warnings into JSON
ini_set('log_errors', '1');

$base = dirname(__DIR__);                  // .../api
require_once $base . '/config/db.php';
require_once $base . '/core/response.php';
require_once $base . '/core/jwt.php';
require_once $base . '/core/auth.php';
require_once $base . '/core/crud.php';

send_cors();

// Convert uncaught exceptions into clean JSON 500s.
set_exception_handler(function (Throwable $e) {
    respond([
        'error'  => 'Server error',
        'detail' => $e->getMessage(),
    ], 500);
});
