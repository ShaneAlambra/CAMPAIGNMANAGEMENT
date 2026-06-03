<?php
/**
 * JSON response + CORS + request helpers.
 * Included at the top of every endpoint via bootstrap.php.
 */

/** Send CORS headers so the frontend (AJAX) can call the API. */
function send_cors(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');

    // Pre-flight: browsers send OPTIONS before the real request.
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** Emit a JSON payload with a status code and stop. */
function respond($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

/** Emit a JSON error and stop. */
function fail(string $message, int $status = 400, array $extra = []): void
{
    respond(array_merge(['error' => $message], $extra), $status);
}

/** Parse the JSON request body into an associative array. */
function body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Read the HTTP method (honours ?_method= override for old clients). */
function method(): string
{
    $m = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($m === 'POST' && isset($_GET['_method'])) {
        $m = strtoupper($_GET['_method']);
    }
    return $m;
}
