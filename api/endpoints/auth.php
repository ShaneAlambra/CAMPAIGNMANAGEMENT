<?php
/**
 * Auth endpoints:
 *   POST /api/auth/login            { email, password }      -> { token, user }
 *   GET  /api/auth/me               (Bearer)                 -> { user }
 *   POST /api/auth/forgot-password  { email }                -> { ok, token? }
 *   POST /api/auth/reset-password   { token, password }      -> { ok }
 */

require_once dirname(__DIR__) . '/core/bootstrap.php';

/** @var string $action  the sub-route after /auth/ (set by the router) */
$action = $action ?? '';

switch ($action) {

    /* ---------------------------------------------------- LOGIN */
    case 'login': {
        if (method() !== 'POST') fail('Use POST', 405);
        $in = body();
        $email = trim($in['email'] ?? '');
        $pass  = $in['password'] ?? '';

        if ($email === '' || $pass === '') {
            fail('Email and password are required', 422);
        }

        $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($pass, $user['password_hash'])) {
            fail('Invalid email or password', 401);
        }
        if ($user['status'] === 'Suspended') {
            fail('This account is suspended. Contact your admin.', 403);
        }

        // Record sign-in (last_active + audit).
        db()->prepare('UPDATE users SET last_active = NOW() WHERE id = ?')
            ->execute([$user['id']]);
        db()->prepare(
            'INSERT INTO audit_logs (time, user, action, target, type, ip)
             VALUES (NOW(), ?, ?, ?, ?, ?)'
        )->execute([$user['name'], 'Logged in', '—', 'auth', $_SERVER['REMOTE_ADDR'] ?? '—']);

        $token = jwt_encode([
            'sub'   => (int)$user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ]);

        respond([
            'token' => $token,
            'user'  => [
                'id'    => (int)$user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role'],
                'team'  => $user['team'],
            ],
        ]);
        break;
    }

    /* ------------------------------------------------------- ME */
    case 'me': {
        $claims = require_auth();
        $stmt = db()->prepare('SELECT id, name, email, role, team, status FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$claims['sub']]);
        $user = $stmt->fetch();
        if (!$user) fail('User no longer exists', 404);
        $user['id'] = (int)$user['id'];
        respond(['user' => $user]);
        break;
    }

    /* ------------------------------------------ FORGOT PASSWORD */
    case 'forgot-password': {
        if (method() !== 'POST') fail('Use POST', 405);
        $email = trim(body()['email'] ?? '');
        if ($email === '') fail('Email is required', 422);

        $stmt = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $exists = $stmt->fetch();

        // Always respond OK (don't reveal whether the email is registered).
        $resp = ['ok' => true, 'message' => 'If that email exists, a reset link has been sent.'];

        if ($exists) {
            $token = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', time() + 30 * 60); // 30 min
            db()->prepare(
                'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)'
            )->execute([$email, $token, $expires]);

            // In a real app you'd EMAIL this link. For local dev we return it
            // so you can test the reset flow without a mail server.
            $resp['dev_reset_token'] = $token;
        }
        respond($resp);
        break;
    }

    /* ------------------------------------------- RESET PASSWORD */
    case 'reset-password': {
        if (method() !== 'POST') fail('Use POST', 405);
        $in = body();
        $token = $in['token'] ?? '';
        $pass  = $in['password'] ?? '';
        if ($token === '' || strlen($pass) < 6) {
            fail('Token and a password (min 6 chars) are required', 422);
        }

        $stmt = db()->prepare(
            'SELECT * FROM password_resets
             WHERE token = ? AND used = 0 AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        if (!$row) fail('This reset link is invalid or has expired', 400);

        $hash = password_hash($pass, PASSWORD_BCRYPT);
        db()->prepare('UPDATE users SET password_hash = ? WHERE email = ?')
            ->execute([$hash, $row['email']]);
        db()->prepare('UPDATE password_resets SET used = 1 WHERE id = ?')
            ->execute([$row['id']]);

        respond(['ok' => true, 'message' => 'Password updated. You can now sign in.']);
        break;
    }

    default:
        fail('Unknown auth action', 404);
}
