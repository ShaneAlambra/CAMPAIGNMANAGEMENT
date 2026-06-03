<?php
/**
 * Approvals — /api/approvals
 *   GET    /approvals             -> list
 *   PUT    /approvals/{id}/approve -> approve (advance to final stage)
 *   PUT    /approvals/{id}/reject  -> reject
 *   POST   /approvals             -> create
 *   DELETE /approvals/{id}
 *
 * The router passes the third path segment as $sub (e.g. 'approve').
 */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();
$id  = $id  ?? null;
$sub = $sub ?? null;

/** Decode the JSON steps column into a real array for output. */
function shape_approval(array $r): array
{
    return [
        'id'        => (int)$r['id'],
        'item'      => $r['item'],
        'type'      => $r['type'],
        'requester' => $r['requester'],
        'amount'    => (float)$r['amount'],
        'submitted' => $r['submitted'],
        'stage'     => (int)$r['stage'],
        'status'    => $r['status'],
        'steps'     => json_decode($r['steps'] ?? '[]', true) ?: [],
    ];
}

// --- Custom actions: approve / reject ---------------------------
if ($id !== null && $sub && method() === 'PUT') {
    require_role(['Admin', 'Manager']); // only managers+ sign off
    $stmt = db()->prepare('SELECT * FROM approvals WHERE id = ?');
    $stmt->execute([$id]);
    $a = $stmt->fetch();
    if (!$a) fail('Approval not found', 404);

    if ($sub === 'approve') {
        $steps = json_decode($a['steps'] ?? '[]', true) ?: [];
        db()->prepare('UPDATE approvals SET status = ?, stage = ? WHERE id = ?')
            ->execute(['Approved', count($steps), $id]);
        crud_audit('approval', $claims, 'Approved', $a['item'], 'approve');
    } elseif ($sub === 'reject') {
        db()->prepare('UPDATE approvals SET status = ? WHERE id = ?')
            ->execute(['Rejected', $id]);
        crud_audit('approval', $claims, 'Rejected', $a['item'], 'delete');
    } else {
        fail('Unknown approval action', 404);
    }

    $stmt = db()->prepare('SELECT * FROM approvals WHERE id = ?');
    $stmt->execute([$id]);
    respond(shape_approval($stmt->fetch()));
}

// --- Standard CRUD ---------------------------------------------
crud_resource([
    'table'    => 'approvals',
    'audit'    => 'approval',
    'required' => ['item'],
    'filters'  => ['status' => 'status', 'type' => 'type'],
    'search'   => ['item', 'requester'],
    'fields'   => [
        'item'      => 'str',
        'type'      => 'str',
        'requester' => 'str',
        'amount'    => 'float',
        'submitted' => 'date',
        'stage'     => 'int',
        'status'    => 'str',
        'steps'     => 'json',
    ],
    'shape' => 'shape_approval',
    'audit_label' => fn($r) => $r['item'],
], $id, $claims);
