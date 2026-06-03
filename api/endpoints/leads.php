<?php
/** Leads CRUD — /api/leads */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();
$id = $id ?? null;

crud_resource([
    'table'    => 'leads',
    'audit'    => 'lead',
    'required' => ['name'],
    'filters'  => ['status' => 'status', 'source' => 'source', 'owner' => 'owner'],
    'search'   => ['name', 'company', 'email'],
    'fields'   => [
        'name'    => 'str',
        'company' => 'str',
        'email'   => 'str',
        'score'   => 'int',
        'status'  => 'str',
        'source'  => 'str',
        'value'   => 'float',
        'owner'   => 'str',
        'created' => 'date',
    ],
    'shape' => fn($r) => [
        'id'      => (int)$r['id'],
        'name'    => $r['name'],
        'company' => $r['company'],
        'email'   => $r['email'],
        'score'   => (int)$r['score'],
        'status'  => $r['status'],
        'source'  => $r['source'],
        'value'   => (float)$r['value'],
        'owner'   => $r['owner'],
        'created' => $r['created'],
    ],
], $id, $claims);
