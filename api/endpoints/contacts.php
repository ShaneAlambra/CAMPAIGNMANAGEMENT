<?php
/** Contacts (CRM) CRUD — /api/contacts.  DB col last_touch <-> JS lastTouch. */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();
$id = $id ?? null;

crud_resource([
    'table'    => 'contacts',
    'audit'    => 'contact',
    'required' => ['name'],
    'filters'  => ['stage' => 'stage', 'owner' => 'owner'],
    'search'   => ['name', 'company', 'email'],
    'aliases'  => ['lastTouch' => 'last_touch'],
    'fields'   => [
        'name'       => 'str',
        'company'    => 'str',
        'title'      => 'str',
        'email'      => 'str',
        'phone'      => 'str',
        'stage'      => 'str',
        'value'      => 'float',
        'owner'      => 'str',
        'last_touch' => 'date',
    ],
    'shape' => fn($r) => [
        'id'        => (int)$r['id'],
        'name'      => $r['name'],
        'company'   => $r['company'],
        'title'     => $r['title'],
        'email'     => $r['email'],
        'phone'     => $r['phone'],
        'stage'     => $r['stage'],
        'value'     => (float)$r['value'],
        'owner'     => $r['owner'],
        'lastTouch' => $r['last_touch'],
    ],
], $id, $claims);
