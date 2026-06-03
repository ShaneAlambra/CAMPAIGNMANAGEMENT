<?php
/**
 * Campaigns CRUD:
 *   GET    /api/campaigns          -> list (optional ?status= &channel= &q=)
 *   GET    /api/campaigns/{id}     -> single
 *   POST   /api/campaigns          -> create
 *   PUT    /api/campaigns/{id}     -> update
 *   DELETE /api/campaigns/{id}     -> delete
 *
 * The DB columns are start_date / end_date, but the frontend uses
 * start / end — so we alias them on the way out and map on the way in.
 */

require_once dirname(__DIR__) . '/core/bootstrap.php';

$claims = require_auth();        // any signed-in user may read
$id = $id ?? null;               // set by the router for /campaigns/{id}

/** Shape a DB row into the JSON the frontend expects. */
function shape_campaign(array $r): array
{
    return [
        'id'       => (int)$r['id'],
        'name'     => $r['name'],
        'channel'  => $r['channel'],
        'status'   => $r['status'],
        'owner'    => $r['owner'],
        'budget'   => (float)$r['budget'],
        'spent'    => (float)$r['spent'],
        'leads'    => (int)$r['leads'],
        'roi'      => (float)$r['roi'],
        'start'    => $r['start_date'],
        'end'      => $r['end_date'],
        'progress' => (int)$r['progress'],
    ];
}

/** Writes an audit row for campaign changes. */
function audit_campaign(array $claims, string $action, string $target, string $type): void
{
    db()->prepare(
        'INSERT INTO audit_logs (time, user, action, target, type, ip)
         VALUES (NOW(), ?, ?, ?, ?, ?)'
    )->execute([
        $claims['name'] ?? 'Unknown', $action, $target, $type,
        $_SERVER['REMOTE_ADDR'] ?? '—',
    ]);
}

switch (method()) {

    /* ----------------------------------------------------- READ */
    case 'GET': {
        if ($id !== null) {
            $stmt = db()->prepare('SELECT * FROM campaigns WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) fail('Campaign not found', 404);
            respond(shape_campaign($row));
        }

        // List with optional filters.
        $sql = 'SELECT * FROM campaigns WHERE 1=1';
        $args = [];
        if (!empty($_GET['status']))  { $sql .= ' AND status = ?';  $args[] = $_GET['status']; }
        if (!empty($_GET['channel'])) { $sql .= ' AND channel = ?'; $args[] = $_GET['channel']; }
        if (!empty($_GET['q'])) {
            $sql .= ' AND (name LIKE ? OR owner LIKE ?)';
            $like = '%' . $_GET['q'] . '%';
            $args[] = $like; $args[] = $like;
        }
        $sql .= ' ORDER BY id DESC';

        $stmt = db()->prepare($sql);
        $stmt->execute($args);
        respond(array_map('shape_campaign', $stmt->fetchAll()));
        break;
    }

    /* --------------------------------------------------- CREATE */
    case 'POST': {
        require_role(['Admin', 'Manager', 'Editor']);
        $in = body();
        if (empty(trim($in['name'] ?? ''))) fail('Campaign name is required', 422);

        $stmt = db()->prepare(
            'INSERT INTO campaigns
               (name, channel, status, owner, budget, spent, leads, roi, start_date, end_date, progress)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $in['name'],
            $in['channel'] ?? 'Email',
            $in['status']  ?? 'Draft',
            $in['owner']   ?? ($claims['name'] ?? ''),
            (float)($in['budget'] ?? 0),
            (float)($in['spent']  ?? 0),
            (int)($in['leads']    ?? 0),
            (float)($in['roi']    ?? 0),
            ($in['start'] ?? null) ?: null,
            ($in['end']   ?? null) ?: null,
            (int)($in['progress'] ?? 0),
        ]);
        $newId = (int)db()->lastInsertId();
        audit_campaign($claims, 'Created campaign', $in['name'], 'create');

        $row = db()->query("SELECT * FROM campaigns WHERE id = $newId")->fetch();
        respond(shape_campaign($row), 201);
        break;
    }

    /* --------------------------------------------------- UPDATE */
    case 'PUT':
    case 'PATCH': {
        require_role(['Admin', 'Manager', 'Editor']);
        if ($id === null) fail('Campaign id is required', 400);

        $stmt = db()->prepare('SELECT * FROM campaigns WHERE id = ?');
        $stmt->execute([$id]);
        $cur = $stmt->fetch();
        if (!$cur) fail('Campaign not found', 404);

        $in = body();
        // Merge: only overwrite fields that were supplied.
        $data = [
            'name'       => $in['name']     ?? $cur['name'],
            'channel'    => $in['channel']  ?? $cur['channel'],
            'status'     => $in['status']   ?? $cur['status'],
            'owner'      => $in['owner']    ?? $cur['owner'],
            'budget'     => isset($in['budget'])   ? (float)$in['budget']   : $cur['budget'],
            'spent'      => isset($in['spent'])    ? (float)$in['spent']    : $cur['spent'],
            'leads'      => isset($in['leads'])    ? (int)$in['leads']      : $cur['leads'],
            'roi'        => isset($in['roi'])      ? (float)$in['roi']      : $cur['roi'],
            'start_date' => array_key_exists('start', $in) ? ($in['start'] ?: null) : $cur['start_date'],
            'end_date'   => array_key_exists('end', $in)   ? ($in['end'] ?: null)   : $cur['end_date'],
            'progress'   => isset($in['progress']) ? (int)$in['progress']   : $cur['progress'],
        ];

        $stmt = db()->prepare(
            'UPDATE campaigns SET
               name=?, channel=?, status=?, owner=?, budget=?, spent=?,
               leads=?, roi=?, start_date=?, end_date=?, progress=?
             WHERE id=?'
        );
        $stmt->execute([
            $data['name'], $data['channel'], $data['status'], $data['owner'],
            $data['budget'], $data['spent'], $data['leads'], $data['roi'],
            $data['start_date'], $data['end_date'], $data['progress'], $id,
        ]);
        audit_campaign($claims, 'Updated campaign', $data['name'], 'update');

        $row = db()->prepare('SELECT * FROM campaigns WHERE id = ?');
        $row->execute([$id]);
        respond(shape_campaign($row->fetch()));
        break;
    }

    /* --------------------------------------------------- DELETE */
    case 'DELETE': {
        require_role(['Admin', 'Manager']);
        if ($id === null) fail('Campaign id is required', 400);

        $stmt = db()->prepare('SELECT name FROM campaigns WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) fail('Campaign not found', 404);

        db()->prepare('DELETE FROM campaigns WHERE id = ?')->execute([$id]);
        audit_campaign($claims, 'Deleted campaign', $row['name'], 'delete');
        respond(['ok' => true, 'deleted' => (int)$id]);
        break;
    }

    default:
        fail('Method not allowed', 405);
}
