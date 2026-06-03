<?php
/**
 * Front controller / router for the Cadence REST API.
 *
 * Maps URLs to endpoint files in /endpoints:
 *   /api/auth/login            -> endpoints/auth.php       ($action = 'login')
 *   /api/campaigns             -> endpoints/campaigns.php
 *   /api/campaigns/12          -> endpoints/campaigns.php  ($id = 12)
 *
 * Add a line to $ROUTES for each new module (leads, contacts, ...).
 */

require_once __DIR__ . '/core/bootstrap.php';

// --- Work out the path after /api/ -----------------------------
$uri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri  = rawurldecode($uri);

// Strip everything up to and including "/api/"
$pos = stripos($uri, '/api/');
$path = $pos !== false ? substr($uri, $pos + 5) : ltrim($uri, '/');
// Drop a leading "index.php" (present when .htaccess rewrite isn't active,
// e.g. /api/index.php/auth/login on the PHP built-in server).
$path = preg_replace('#^index\.php/?#i', '', $path);
$path = trim($path, '/');

// Also honour PATH_INFO if the server provides it (extra safety).
if ($path === '' && !empty($_SERVER['PATH_INFO'])) {
    $path = trim($_SERVER['PATH_INFO'], '/');
}

// e.g. "approvals/12/approve" -> ["approvals", "12", "approve"]
$parts    = $path === '' ? [] : explode('/', $path);
$resource = $parts[0] ?? '';
$segment  = $parts[1] ?? null;   // id (or sub-action for auth)
$sub      = $parts[2] ?? null;   // third segment (e.g. approve / reject)

// --- Resources that are handled by a dedicated endpoint file ---
$ROUTES = [
    'auth'          => 'auth.php',
    'campaigns'     => 'campaigns.php',
    'leads'         => 'leads.php',
    'contacts'      => 'contacts.php',
    'budgets'       => 'budgets.php',
    'tasks'         => 'tasks.php',
    'events'        => 'events.php',
    'approvals'     => 'approvals.php',
    'notifications' => 'notifications.php',
    'audit'         => 'audit.php',
    'users'         => 'users.php',
];

if ($resource === '' ) {
    respond([
        'name'    => 'Cadence API',
        'status'  => 'ok',
        'version' => '1.0',
        'endpoints' => array_keys($ROUTES),
    ]);
}

if (!isset($ROUTES[$resource])) {
    fail("Unknown endpoint: /$resource", 404);
}

// Expose the parsed segments to the endpoint under the right names.
if ($resource === 'auth') {
    $action = $segment;                 // /auth/login -> 'login'
} else {
    // Numeric segment -> record id. Non-numeric (e.g. "read-all") stays as
    // a string in $segment so endpoints can detect special actions.
    if ($segment !== null && $segment !== '' && ctype_digit((string)$segment)) {
        $id = (int)$segment;
    } else {
        $id = null;
    }
    // $segment (raw) and $sub (third part) remain available to endpoints.
}

require __DIR__ . '/endpoints/' . $ROUTES[$resource];
