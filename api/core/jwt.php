<?php
/**
 * Minimal, dependency-free JWT (HS256) implementation.
 * No Composer needed — fine for a learning/internal project.
 */

/** URL-safe base64 encode (no padding). */
function b64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/** URL-safe base64 decode. */
function b64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Create a signed JWT for the given payload (claims).
 * iat (issued-at) and exp (expiry) are added automatically.
 */
function jwt_encode(array $payload): string
{
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $now = time();
    $payload['iat'] = $now;
    $payload['exp'] = $now + JWT_TTL;

    $segments = [
        b64url_encode(json_encode($header)),
        b64url_encode(json_encode($payload)),
    ];
    $signing_input = implode('.', $segments);
    $signature = hash_hmac('sha256', $signing_input, JWT_SECRET, true);
    $segments[] = b64url_encode($signature);

    return implode('.', $segments);
}

/**
 * Verify a JWT and return its payload, or null if invalid/expired.
 */
function jwt_decode(string $jwt): ?array
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return null;
    }
    [$h64, $p64, $sig64] = $parts;

    $expected = hash_hmac('sha256', "$h64.$p64", JWT_SECRET, true);
    $actual   = b64url_decode($sig64);

    // Constant-time comparison to prevent timing attacks.
    if (!hash_equals($expected, $actual)) {
        return null;
    }

    $payload = json_decode(b64url_decode($p64), true);
    if (!is_array($payload)) {
        return null;
    }
    if (isset($payload['exp']) && time() >= $payload['exp']) {
        return null; // expired
    }

    return $payload;
}
