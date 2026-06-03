<?php
/**
 * Database connection (PDO) — Cadence Campaign Manager.
 * Default XAMPP credentials: root / no password.
 * Adjust the constants below if your MySQL setup differs.
 */

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'cadence');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

/**
 * JWT secret — CHANGE THIS to a long random string in production.
 * Anyone with this value can forge tokens.
 */
define('JWT_SECRET', 'cadence-dev-secret-change-me-7f3a9b2e1c8d');
define('JWT_TTL', 60 * 60 * 8); // token lifetime: 8 hours

/**
 * Returns a shared PDO instance (singleton).
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'error'   => 'Database connection failed',
            'detail'  => $e->getMessage(),
            'hint'    => 'Make sure MySQL is running in XAMPP and the "cadence" database has been created (import database/schema.sql).',
        ]);
        exit;
    }

    return $pdo;
}
