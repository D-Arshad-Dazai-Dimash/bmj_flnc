-- ================================================================
-- Barnamaj — SQL-скрипты проверки данных в PostgreSQL
-- ================================================================
-- Запуск: расширение «PostgreSQL» (ckolkman.vscode-postgres)
--   1. Ctrl+Shift+P → «PostgreSQL: New Query»
--   2. Выберите соединение barnamaj_db
--   3. Выделите нужный блок → Ctrl+Shift+E для выполнения
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. Все пользователи
-- ────────────────────────────────────────────────────────────────
SELECT
    id,
    email,
    role,
    is_active,
    is_email_verified,
    profile_id,
    created_at
FROM users
ORDER BY created_at DESC;


-- ────────────────────────────────────────────────────────────────
-- 2. Все профили (Individual + Clan + Company)
--    account_type: 1=Individual, 2=Company, 3=Clan
-- ────────────────────────────────────────────────────────────────
SELECT
    id,
    name,
    account_type,
    CASE account_type
        WHEN 1 THEN 'Individual'
        WHEN 2 THEN 'Company'
        WHEN 3 THEN 'Clan'
    END AS type_label,
    is_verified,
    deleted_at IS NULL AS is_active,
    created_at
FROM profiles
ORDER BY account_type, created_at DESC;


-- ────────────────────────────────────────────────────────────────
-- 3. Все членства (с именами пользователя и профиля)
--    role_in_group: 1=Member, 2=Admin, 3=Owner
--    status:        0=Pending, 1=Active, 2=Rejected, 3=Left, 4=Kicked
-- ────────────────────────────────────────────────────────────────
SELECT
    m.id             AS membership_id,
    u.email          AS user_email,
    p.name           AS profile_name,
    CASE p.account_type
        WHEN 2 THEN 'Company'
        WHEN 3 THEN 'Clan'
    END              AS profile_type,
    CASE m.role_in_group
        WHEN 1 THEN 'Member'
        WHEN 2 THEN 'Admin'
        WHEN 3 THEN 'Owner'
    END              AS role,
    CASE m.status
        WHEN 0 THEN 'Pending'
        WHEN 1 THEN 'Active'
        WHEN 2 THEN 'Rejected'
        WHEN 3 THEN 'Left'
        WHEN 4 THEN 'Kicked'
    END              AS status,
    m.joined_at,
    inv.email        AS invited_by
FROM memberships m
JOIN users   u   ON u.id = m.user_id
JOIN profiles p  ON p.id = m.profile_id
LEFT JOIN users inv ON inv.id = m.invited_by_user_id
ORDER BY m.created_at DESC;


-- ────────────────────────────────────────────────────────────────
-- 4. Кланы/Компании с количеством участников
-- ────────────────────────────────────────────────────────────────
SELECT
    p.id,
    p.name,
    CASE p.account_type
        WHEN 2 THEN 'Company'
        WHEN 3 THEN 'Clan'
    END                          AS type,
    COUNT(m.id) FILTER (WHERE m.status = 1) AS active_members,
    COUNT(m.id) FILTER (WHERE m.status = 0) AS pending_invites,
    p.created_at
FROM profiles p
LEFT JOIN memberships m ON m.profile_id = p.id
WHERE p.account_type IN (2, 3)
  AND p.deleted_at IS NULL
GROUP BY p.id, p.name, p.account_type, p.created_at
ORDER BY active_members DESC;


-- ────────────────────────────────────────────────────────────────
-- 5. Найти всех участников конкретного клана/компании
--    Замените 'DevClan' на нужное имя профиля
-- ────────────────────────────────────────────────────────────────
SELECT
    u.email,
    CASE m.role_in_group
        WHEN 1 THEN 'Member'
        WHEN 2 THEN 'Admin'
        WHEN 3 THEN 'Owner'
    END   AS role,
    CASE m.status
        WHEN 0 THEN 'Pending'
        WHEN 1 THEN 'Active'
    END   AS status,
    m.joined_at
FROM memberships m
JOIN users   u ON u.id = m.user_id
JOIN profiles p ON p.id = m.profile_id
WHERE p.name = 'DevClan'          -- ← замените на нужное имя
ORDER BY m.role_in_group DESC, m.joined_at;


-- ────────────────────────────────────────────────────────────────
-- 6. Проверка: User-to-Profile связь (личные профили)
--    Каждый User (Individual) должен иметь ровно один Profile
-- ────────────────────────────────────────────────────────────────
SELECT
    u.id    AS user_id,
    u.email,
    p.id    AS profile_id,
    p.name  AS profile_name,
    CASE p.account_type WHEN 1 THEN 'Individual' ELSE 'Other' END AS type
FROM users u
LEFT JOIN profiles p ON p.id = u.profile_id
ORDER BY u.created_at DESC;


-- ────────────────────────────────────────────────────────────────
-- 7. Проверка целостности: пользователи БЕЗ личного профиля
--    (в норме — пустой результат)
-- ────────────────────────────────────────────────────────────────
SELECT u.id, u.email, u.created_at
FROM users u
WHERE u.profile_id IS NULL
   OR NOT EXISTS (
       SELECT 1 FROM profiles p
       WHERE p.id = u.profile_id
         AND p.deleted_at IS NULL
   );


-- ────────────────────────────────────────────────────────────────
-- 8. Все применённые миграции EF Core
-- ────────────────────────────────────────────────────────────────
SELECT migration_id, product_version
FROM "__EFMigrationsHistory"
ORDER BY migration_id;
