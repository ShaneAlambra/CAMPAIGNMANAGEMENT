<?php
/**
 * Authentication middleware — pulls the Bearer token from the
 * Authorization header, verifies it, and returns the user claims.
 */

/** Extract the raw Bearer token from the request, or null. */
function bearer_token(): ?string
{
    $header = null;

    // Most servers expose it here:
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        // Apache (XAMPP) sometimes hides it; fetch from apache headers.
        $headers = apache_request_headers();
        foreach ($headers as $k => $v) {
            if (strcasecmp($k, 'Authorization') === 0) {
                $header = $v;
                break;
            }
        }
    }

    if ($header && preg_match('/Bearer\s+(.+)/i', $header, $m)) {
        return trim($m[1]);
    }
    return null;
}

/**
 * Require a valid token. On failure, sends 401 and stops.
 * On success, returns the decoded payload (sub, name, email, role).
 */
function require_auth(): array
{
    $token = bearer_token();
    if (!$token) {
        fail('Missing authorization token', 401);
    }
    $claims = jwt_decode($token);
    if (!$claims) {
        fail('Invalid or expired token', 401);
    }
    return $claims;
}

/**
 * Require that the authenticated user has one of the given roles.
 * Pass an empty array to allow any authenticated user.
 */
function require_role(array $roles): array
{
    $claims = require_auth();
    if ($roles && !in_array($claims['role'] ?? '', $roles, true)) {
        fail('You do not have permission to perform this action', 403);
    }
    return $claims;
}
