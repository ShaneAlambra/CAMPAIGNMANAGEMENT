<?php
/** Audit logs — READ ONLY. /api/audit  (Admin only, immutable record) */
require_once dirname(__DIR__) . '/core/bootstrap.php';
require_role(['Admin']);

if (method() !== 'GET') fail('Audit logs are read-only', 405);

$sql = 'SELECT * FROM audit_logs WHERE 1=1';
$args = [];
if (!empty($_GET['type'])) { $sql .= ' AND type = ?'; $args[] = $_GET['type']; }
if (!empty($_GET['q'])) {
    $sql .= ' AND (user LIKE ? OR action LIKE ? OR target LIKE ?)';
    $like = '%' . $_GET['q'] . '%';
    array_push($args, $like, $like, $like);
}
$sql .= ' ORDER BY time DESC, id DESC';

$stmt = db()->prepare($sql);
$stmt->execute($args);

respond(array_map(fn($r) => [
    'id'     => (int)$r['id'],
    'time'   => date('Y-m-d H:i', strtotime($r['time'])),
    'user'   => $r['user'],
    'action' => $r['action'],
    'target' => $r['target'],
    'type'   => $r['type'],
    'ip'     => $r['ip'],
], $stmt->fetchAll()));
