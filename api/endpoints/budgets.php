<?php
/** Budgets CRUD — /api/budgets */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();
$id = $id ?? null;

crud_resource([
    'table'    => 'budgets',
    'audit'    => 'budget',
    'required' => ['campaign'],
    'filters'  => ['channel' => 'channel', 'quarter' => 'quarter'],
    'search'   => ['campaign'],
    'fields'   => [
        'campaign'  => 'str',
        'channel'   => 'str',
        'allocated' => 'float',
        'spent'     => 'float',
        'committed' => 'float',
        'quarter'   => 'str',
    ],
    'shape' => fn($r) => [
        'id'        => (int)$r['id'],
        'campaign'  => $r['campaign'],
        'channel'   => $r['channel'],
        'allocated' => (float)$r['allocated'],
        'spent'     => (float)$r['spent'],
        'committed' => (float)$r['committed'],
        'quarter'   => $r['quarter'],
    ],
], $id, $claims);
