<?php
/**
 * Users + role permission matrix — /api/users  (Admin only for writes).
 *   GET    /users           -> { users:[...], roleMatrix:{...} }
 *   POST   /users           -> invite (creates Active/Invited user, default pw)
 *   PUT    /users/{id}      -> edit
 *   DELETE /users/{id}      -> remove
 *
 * The frontend expects a combined payload on GET (list view + matrix card),
 * so the list response is wrapped rather than a bare array.
 */
require_once dirname(__DIR__) . '/core/bootstrap.php';
$claims = require_auth();
$id = $id ?? null;

/** Build the roleMatrix shape the frontend's matrix table expects. */
function role_matrix(): array
{
    $rows = db()->query('SELECT * FROM role_permissions ORDER BY id')->fetchAll();
    return [
        'roles' => ['Admin', 'Manager', 'Editor', 'Viewer'],
        'perms' => array_map(fn($r) => [
            'area' => $r['area'],
            'vals' => [
                (bool)$r['admin_allow'],
                (bool)$r['manager_allow'],
                (bool)$r['editor_allow'],
                (bool)$r['viewer_allow'],
            ],
        ], $rows),
    ];
}

function shape_user(array $r): array
{
    return [
        'id'         => (int)$r['id'],
        'name'       => $r['name'],
        'email'      => $r['email'],
        'role'       => $r['role'],
        'team'       => $r['team'],
        'status'     => $r['status'],
        'lastActive' => $r['last_active']
            ? date('Y-m-d H:i', strtotime($r['last_active']))
            : '—',
    ];
}

switch (method()) {

    case 'GET': {
        if ($id !== null) {
            $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) fail('User not found', 404);
            respond(shape_user($row));
        }
        $users = db()->query('SELECT * FROM users ORDER BY id')->fetchAll();
        respond([
            'users'      => array_map('shape_user', $users),
            'roleMatrix' => role_matrix(),
        ]);
        break;
    }

    case 'POST': {
        require_role(['Admin']);
        $in = body();
        if (empty(trim($in['email'] ?? ''))) fail('Email is required', 422);
        // New invited users get a default password they must reset.
        $hash = password_hash('campaign2026', PASSWORD_BCRYPT);
        $stmt = db()->prepare(
            'INSERT INTO users (name, email, password_hash, role, team, status)
             VALUES (?,?,?,?,?,?)'
        );
        try {
            $stmt->execute([
                $in['name'] ?? 'New user',
                $in['email'],
                $hash,
                $in['role'] ?? 'Viewer',
                $in['team'] ?? null,
                $in['status'] ?? 'Invited',
            ]);
        } catch (PDOException $e) {
            fail('A user with that email already exists', 409);
        }
        $newId = (int)db()->lastInsertId();
        crud_audit('user', $claims, 'Invited', $in['email'], 'create');
        $row = db()->prepare('SELECT * FROM users WHERE id = ?');
        $row->execute([$newId]);
        respond(shape_user($row->fetch()), 201);
        break;
    }

    case 'PUT':
    case 'PATCH': {
        require_role(['Admin']);
        if ($id === null) fail('User id is required', 400);
        $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $cur = $stmt->fetch();
        if (!$cur) fail('User not found', 404);

        $in = body();
        $data = [
            'name'   => $in['name']   ?? $cur['name'],
            'email'  => $in['email']  ?? $cur['email'],
            'role'   => $in['role']   ?? $cur['role'],
            'team'   => $in['team']   ?? $cur['team'],
            'status' => $in['status'] ?? $cur['status'],
        ];
        db()->prepare('UPDATE users SET name=?, email=?, role=?, team=?, status=? WHERE id=?')
            ->execute([$data['name'], $data['email'], $data['role'], $data['team'], $data['status'], $id]);
        crud_audit('user', $claims, 'Updated', $data['name'], 'update');
        $row = db()->prepare('SELECT * FROM users WHERE id = ?');
        $row->execute([$id]);
        respond(shape_user($row->fetch()));
        break;
    }

    case 'DELETE': {
        require_role(['Admin']);
        if ($id === null) fail('User id is required', 400);
        if ((int)$id === (int)($claims['sub'] ?? 0)) fail('You cannot remove your own account', 400);
        $stmt = db()->prepare('SELECT name FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) fail('User not found', 404);
        db()->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        crud_audit('user', $claims, 'Removed', $row['name'], 'delete');
        respond(['ok' => true, 'deleted' => (int)$id]);
        break;
    }

    default:
        fail('Method not allowed', 405);
}
