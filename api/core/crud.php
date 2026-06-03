<?php
/**
 * Generic CRUD helper — drives a standard REST resource from a small config.
 * Each endpoint file just calls crud_resource([...]) and is done.
 *
 * Config keys:
 *   table     (string)  DB table name.
 *   fields    (array)   writable columns => caster ('str'|'int'|'float'|'date'|'bool'|'json').
 *   required  (array)   field names that must be present & non-empty on create.
 *   filters   (array)   query-param => column (exact-match list filters).
 *   search    (array)   columns matched by ?q= (LIKE).
 *   shape     (callable|null)  optional row -> output transformer.
 *   write_roles (array) roles allowed to create/update (default Admin/Manager/Editor).
 *   delete_roles(array) roles allowed to delete (default Admin/Manager).
 *   audit     (string|null) singular noun for audit logs ('lead'); null = no audit.
 *   audit_label(callable|null) row -> human label for audit target.
 *   aliases   (array)   incoming-body key => db column (e.g. lastTouch => last_touch).
 */

/** Rename incoming body keys to their DB column names (per $aliases). */
function apply_aliases(array $in, array $aliases): array
{
    foreach ($aliases as $from => $to) {
        if (array_key_exists($from, $in)) {
            $in[$to] = $in[$from];
            unset($in[$from]);
        }
    }
    return $in;
}

function cast_value($value, string $type)
{
    if ($value === null) return null;
    switch ($type) {
        case 'int':   return (int)$value;
        case 'float': return (float)$value;
        case 'bool':  return $value ? 1 : 0;
        case 'date':  return $value === '' ? null : $value;
        case 'json':  return is_string($value) ? $value : json_encode($value);
        default:      return (string)$value;
    }
}

function crud_audit(?string $noun, array $claims, string $verb, string $target, string $type): void
{
    if (!$noun) return;
    db()->prepare(
        'INSERT INTO audit_logs (time, user, action, target, type, ip)
         VALUES (NOW(), ?, ?, ?, ?, ?)'
    )->execute([
        $claims['name'] ?? 'Unknown',
        "$verb $noun",
        $target,
        $type,
        $_SERVER['REMOTE_ADDR'] ?? '—',
    ]);
}

function crud_resource(array $cfg, $id, array $claims): void
{
    $table       = $cfg['table'];
    $fields      = $cfg['fields'];
    $required    = $cfg['required']   ?? [];
    $filters     = $cfg['filters']    ?? [];
    $search      = $cfg['search']     ?? [];
    $shape       = $cfg['shape']      ?? null;
    $writeRoles  = $cfg['write_roles']  ?? ['Admin', 'Manager', 'Editor'];
    $deleteRoles = $cfg['delete_roles'] ?? ['Admin', 'Manager'];
    $aliases     = $cfg['aliases']    ?? [];
    $auditNoun   = $cfg['audit']       ?? null;
    $auditLabel  = $cfg['audit_label'] ?? fn($r) => (string)($r['name'] ?? $r['title'] ?? $r['item'] ?? $r['campaign'] ?? ('#' . ($r['id'] ?? '?')));

    $out = fn(array $r) => $shape ? $shape($r) : $r;

    switch (method()) {

        case 'GET': {
            if ($id !== null) {
                $stmt = db()->prepare("SELECT * FROM `$table` WHERE id = ?");
                $stmt->execute([$id]);
                $row = $stmt->fetch();
                if (!$row) fail(ucfirst($auditNoun ?: 'Record') . ' not found', 404);
                respond($out($row));
            }
            $sql = "SELECT * FROM `$table` WHERE 1=1";
            $args = [];
            foreach ($filters as $param => $col) {
                if (!empty($_GET[$param])) { $sql .= " AND `$col` = ?"; $args[] = $_GET[$param]; }
            }
            if (!empty($_GET['q']) && $search) {
                $sql .= ' AND (' . implode(' OR ', array_map(fn($c) => "`$c` LIKE ?", $search)) . ')';
                foreach ($search as $_) $args[] = '%' . $_GET['q'] . '%';
            }
            $sql .= ' ORDER BY id DESC';
            $stmt = db()->prepare($sql);
            $stmt->execute($args);
            respond(array_map($out, $stmt->fetchAll()));
            break;
        }

        case 'POST': {
            require_role($writeRoles);
            $in = apply_aliases(body(), $aliases);
            foreach ($required as $r) {
                if (!isset($in[$r]) || trim((string)$in[$r]) === '') fail("Field '$r' is required", 422);
            }
            $cols = array_keys($fields);
            $place = implode(',', array_fill(0, count($cols), '?'));
            $vals = [];
            foreach ($fields as $col => $type) {
                $vals[] = cast_value($in[$col] ?? null, $type);
            }
            $stmt = db()->prepare("INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES ($place)");
            $stmt->execute($vals);
            $newId = (int)db()->lastInsertId();

            $row = db()->prepare("SELECT * FROM `$table` WHERE id = ?");
            $row->execute([$newId]);
            $created = $row->fetch();
            crud_audit($auditNoun, $claims, 'Created', $auditLabel($created), 'create');
            respond($out($created), 201);
            break;
        }

        case 'PUT':
        case 'PATCH': {
            require_role($writeRoles);
            if ($id === null) fail('Record id is required', 400);
            $stmt = db()->prepare("SELECT * FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            $cur = $stmt->fetch();
            if (!$cur) fail('Record not found', 404);

            $in = apply_aliases(body(), $aliases);
            $set = [];
            $vals = [];
            foreach ($fields as $col => $type) {
                if (array_key_exists($col, $in)) {
                    $set[] = "`$col` = ?";
                    $vals[] = cast_value($in[$col], $type);
                }
            }
            if ($set) {
                $vals[] = $id;
                db()->prepare("UPDATE `$table` SET " . implode(',', $set) . " WHERE id = ?")->execute($vals);
            }
            $stmt = db()->prepare("SELECT * FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            $updated = $stmt->fetch();
            crud_audit($auditNoun, $claims, 'Updated', $auditLabel($updated), 'update');
            respond($out($updated));
            break;
        }

        case 'DELETE': {
            require_role($deleteRoles);
            if ($id === null) fail('Record id is required', 400);
            $stmt = db()->prepare("SELECT * FROM `$table` WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) fail('Record not found', 404);
            db()->prepare("DELETE FROM `$table` WHERE id = ?")->execute([$id]);
            crud_audit($auditNoun, $claims, 'Deleted', $auditLabel($row), 'delete');
            respond(['ok' => true, 'deleted' => (int)$id]);
            break;
        }

        default:
            fail('Method not allowed', 405);
    }
}
