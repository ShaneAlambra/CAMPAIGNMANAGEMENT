<?php
/**
 * One-time helper: set a real bcrypt password for every seeded user.
 * Open in a browser AFTER importing schema.sql:
 *     http://localhost/CAMPAIGNMANAGEMENT/api/seed_passwords.php
 *
 * Default password for ALL demo users:  campaign2026
 * Delete this file once you're done (it's a dev convenience).
 */

require_once __DIR__ . '/config/db.php';
header('Content-Type: text/plain; charset=utf-8');

$defaultPassword = 'campaign2026';
$hash = password_hash($defaultPassword, PASSWORD_BCRYPT);

$count = db()->exec('UPDATE users SET password_hash = ' . db()->quote($hash));

echo "✅ Updated $count user(s).\n\n";
echo "You can now log in with ANY seeded email, e.g.:\n";
echo "   email:    maya.chen@acme.com\n";
echo "   password: $defaultPassword\n\n";
echo "⚠  Delete api/seed_passwords.php when you're finished.\n";
