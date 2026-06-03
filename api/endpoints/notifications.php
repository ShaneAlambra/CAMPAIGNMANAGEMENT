<?php
/**
 * Notifications — /api/notifications
 *   GET    /notifications                 -> list
 *   PUT    /notifications/{id}            -> mark one read/unread {unread:0|1}
 *   POST   /notifications/read-all        -> mark all read (segment = 'read-all')
 *   DELETE /notifications/{id}
 */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();
$id = $id ?? null;

// Special action: mark all read. Router passes it as the {id} segment.
if ($id === null && ($segment ?? '') === 'read-all' && method() === 'POST') {
    db()->exec('UPDATE notifications SET unread = 0');
    respond(['ok' => true]);
}

crud_resource([
    'table'  => 'notifications',
    'audit'  => null,
    'filters'=> [],
    'fields' => [
        'icon'   => 'str',
        'color'  => 'str',
        'title'  => 'str',
        'body'   => 'str',
        'time'   => 'str',
        'unread' => 'int',
    ],
    'shape' => fn($r) => [
        'id'     => (int)$r['id'],
        'icon'   => $r['icon'],
        'color'  => $r['color'],
        'title'  => $r['title'],
        'body'   => $r['body'],
        'time'   => $r['time'],
        'unread' => (int)$r['unread'] === 1,
    ],
], $id, $claims);
