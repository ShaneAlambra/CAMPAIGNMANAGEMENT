<?php
/** Calendar events CRUD — /api/events.  (day = day-of-month 1..31) */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();
$id = $id ?? null;

crud_resource([
    'table'    => 'events',
    'audit'    => null, // calendar events don't need audit noise
    'required' => ['title'],
    'fields'   => [
        'day'   => 'int',
        'title' => 'str',
        'color' => 'str',
    ],
    'shape' => fn($r) => [
        'id'    => (int)$r['id'],
        'day'   => (int)$r['day'],
        'title' => $r['title'],
        'color' => $r['color'],
    ],
], $id, $claims);
