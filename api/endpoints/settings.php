<?php
/**
 * Settings (key/value) — /api/settings
 *   GET /settings           -> { key: value, ... }  (all settings)
 *   PUT /settings           -> { key: value, ... }   upsert any subset
 *
 * Writes are Admin/Manager only. Values are stored as strings.
 */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();

switch (method()) {

    case 'GET': {
        $rows = db()->query('SELECT k, v FROM settings')->fetchAll();
        $out = [];
        foreach ($rows as $r) {
            $out[$r['k']] = $r['v'];
        }
        respond($out);
        break;
    }

    case 'PUT':
    case 'PATCH':
    case 'POST': {
        require_role(['Admin', 'Manager']);
        $in = body();
        if (!$in) fail('No settings provided', 422);

        // Upsert each supplied key.
        $stmt = db()->prepare(
            'INSERT INTO settings (k, v) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE v = VALUES(v)'
        );
        foreach ($in as $k => $v) {
            // Normalise booleans/numbers to strings for storage.
            if (is_bool($v)) $v = $v ? '1' : '0';
            $stmt->execute([(string)$k, $v === null ? null : (string)$v]);
        }

        crud_audit('settings', $claims, 'Updated', implode(', ', array_keys($in)), 'update');

        // Return the full, fresh settings map.
        $rows = db()->query('SELECT k, v FROM settings')->fetchAll();
        $out = [];
        foreach ($rows as $r) $out[$r['k']] = $r['v'];
        respond($out);
        break;
    }

    default:
        fail('Method not allowed', 405);
}
