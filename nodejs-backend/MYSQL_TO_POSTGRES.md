## Migrating from MySQL to PostgreSQL

This document explains **what needs to change** in this project to move the backend from **MySQL** to **PostgreSQL**.

---

## 1. Dependencies

- **Remove / stop using**: `mysql2`
- **Add**:

```bash
yarn add pg
# or
npm install pg
```

Update any Docker/infra to provide a Postgres instance instead of MySQL.

---

## 2. Database Configuration (`config/database.js`)

### Current (MySQL)

- Uses `mysql2/promise`:
  - `const mysql = require('mysql2/promise');`
  - `const pool = mysql.createPool({ ... })`
  - MySQL-specific `port` default: `3306`
  - Connection test logs: `MySQL Database connected successfully`

### Change to PostgreSQL

- Use `pg`:

```js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cronberry_assets',
  port: process.env.DB_PORT || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool
  .connect()
  .then(client => {
    return client
      .query('SELECT 1')
      .then(() => {
        console.log('✓ PostgreSQL Database connected successfully');
        client.release();
      })
      .catch(err => {
        client.release();
        throw err;
      });
  })
  .catch(err => {
    console.error('✗ PostgreSQL connection error:', err.message);
    process.exit(1);
  });

module.exports = pool;
```

**Environment variables**:

- Keep: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Change default **port** to `5432`.

---

## 3. Query Style Changes in Routes

Files affected (at least):

- `routes/assets.js`
- `routes/employees.js`
- `routes/assignments.js`
- Any other route using `db.query` or `db.getConnection()`

### 3.1 Placeholder syntax

- **MySQL (`mysql2`)**: `?`, `?`, ...
- **Postgres (`pg`)**: `$1`, `$2`, ...

Example (update asset):

- **Before (MySQL)**:

```js
const [result] = await db.query(
  'UPDATE assets SET asset_name = ?, category = ?, brand = ?, serial_number = ?, imei_2 = ?, condition_status = ?, status = ?, remarks = ? WHERE asset_id = ?',
  [asset_name, category, brand, serial_number || null, imei_2 || null, condition, status, remarks ?? null, asset_id]
);
```

- **After (Postgres)**:

```js
const result = await db.query(
  `UPDATE assets
   SET asset_name = $1,
       category = $2,
       brand = $3,
       serial_number = $4,
       imei_2 = $5,
       condition_status = $6,
       status = $7,
       remarks = $8
   WHERE asset_id = $9`,
  [asset_name, category, brand, serial_number || null, imei_2 || null, condition, status, remarks ?? null, asset_id]
);
```

### 3.2 Result object shape

- **MySQL**:
  - `const [rows] = await db.query(...);`
  - `result.affectedRows`
- **Postgres**:
  - `const { rows } = await db.query(...);`
  - `result.rowCount`

Examples:

- Reading:

  - Before:

    ```js
    const [assets] = await db.query('SELECT * FROM assets');
    res.json(assets);
    ```

  - After:

    ```js
    const result = await db.query('SELECT * FROM assets');
    res.json(result.rows);
    ```

- Checking update/delete success:

  - Before: `if (result.affectedRows === 0) { ... }`
  - After: `if (result.rowCount === 0) { ... }`

### 3.3 Transactions

Wherever you currently use:

```js
const connection = await db.getConnection();
await connection.beginTransaction();
// connection.query(...)
await connection.commit();
connection.release();
```

Change to:

```js
const client = await db.connect();

try {
  await client.query('BEGIN');
  // client.query(...) with $1, $2, ...
  await client.query('COMMIT');
  client.release();
} catch (error) {
  await client.query('ROLLBACK');
  client.release();
  throw error;
}
```

Use `client.query(...)` instead of `connection.query(...)`.

### 3.4 Identifiers and aliases

- Remove MySQL-style backticks `` `column` `` in queries.
- In Postgres, you can use:
  - `condition_status AS condition`
  - or leave column names as-is and map in JavaScript.

---

## 4. Schema Changes (`database/schema.sql`)

The current schema is written for MySQL. For PostgreSQL:

### 4.1 Database creation

- MySQL:
  - `CREATE DATABASE IF NOT EXISTS cronberry_assets;`
  - `USE cronberry_assets;`
- Postgres:
  - Typically create DB outside via CLI or UI:

    ```bash
    createdb cronberry_assets
    ```

  - Then connect to it and run the schema (no `USE`).

### 4.2 Auto-increment columns

- **MySQL**: `INT AUTO_INCREMENT PRIMARY KEY`
- **Postgres**: `SERIAL PRIMARY KEY`

Change all `id INT AUTO_INCREMENT PRIMARY KEY` to `id SERIAL PRIMARY KEY`.

### 4.3 ENUM columns

MySQL uses inline `ENUM`. For Postgres, use `TEXT` with a `CHECK` constraint:

- Example (`users.role`):

  - Before:

    ```sql
    role ENUM('HR', 'Admin', 'Employee') DEFAULT 'HR',
    ```

  - After:

    ```sql
    role TEXT NOT NULL DEFAULT 'HR' CHECK (role IN ('HR', 'Admin', 'Employee')),
    ```

Apply this pattern to:

- `users.role`
- `employees.status`
- `assets.condition_status`
- `assets.status`
- `assignments.asset_return_condition`
- `sim_connections.connection_status`
- `sim_connections.sim_status`

### 4.4 Timestamps

- **MySQL**:
  - `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  - `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
- **Postgres**:
  - Use:

    ```sql
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ```

  - If you need auto-update on `updated_at`, add a trigger or update it in your application code.

### 4.5 Indexes

- MySQL allows inline `INDEX idx_name (column)`.
- In Postgres you can either:
  - keep compatible inline syntax in table definition via `CREATE INDEX` after tables, e.g.:

    ```sql
    CREATE INDEX idx_employee_id_employees ON employees (employee_id);
    ```

Adjust all indexes from the MySQL schema to use `CREATE INDEX` statements after table creation.

### 4.6 Foreign keys

Foreign keys are mostly compatible. Example from `assignments`:

```sql
FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE
```

This works the same in Postgres (ensure referenced columns have matching types and unique/primary constraints).

### 4.7 Sample data

The INSERT statements at the end of `schema.sql` work in Postgres as long as:

- Table/column names match the new definitions.
- There are no MySQL-specific functions in the values (they currently use literals, so they are fine).

---

## 5. Step-by-Step Migration Checklist

1. **Set up PostgreSQL**
   - Start a Postgres server.
   - Create DB: `cronberry_assets`.
2. **Apply Postgres schema**
   - Convert `database/schema.sql` to Postgres syntax using the rules above (or create a new `schema_postgres.sql`).
   - Run it against `cronberry_assets`.
3. **Update backend code**
   - Replace `mysql2/promise` with `pg` in `config/database.js`.
   - Update all `db.query` calls:
     - `?` → `$1`, `$2`, ...
     - `[rows] = await db.query(...)` → `{ rows } = await db.query(...)`
     - `affectedRows` → `rowCount`.
   - Update any transaction blocks to use `pool.connect()` + `BEGIN/COMMIT/ROLLBACK`.
4. **Update environment variables**
   - Ensure `.env` points to Postgres (host, user, password, DB name, `DB_PORT=5432`).
5. **Test**
   - Run the server.
   - Exercise routes for:
     - Assets (list/create/update/delete/import/export).
     - Employees.
     - Assignments.
     - SIM connections.

Once all tests pass against Postgres, you can decommission the MySQL database.

