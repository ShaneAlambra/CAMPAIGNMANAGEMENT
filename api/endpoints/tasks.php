<?php
/** Tasks CRUD — /api/tasks */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();
$id = $id ?? null;

crud_resource([
    'table'    => 'tasks',
    'audit'    => 'task',
    'required' => ['title'],
    'filters'  => ['status' => 'status', 'priority' => 'priority', 'assignee' => 'assignee'],
    'search'   => ['title', 'campaign'],
    'fields'   => [
        'title'    => 'str',
        'campaign' => 'str',
        'assignee' => 'str',
        'priority' => 'str',
        'status'   => 'str',
        'due'      => 'date',
    ],
    'shape' => fn($r) => [
        'id'       => (int)$r['id'],
        'title'    => $r['title'],
        'campaign' => $r['campaign'],
        'assignee' => $r['assignee'],
        'priority' => $r['priority'],
        'status'   => $r['status'],
        'due'      => $r['due'],
    ],
], $id, $claims);
