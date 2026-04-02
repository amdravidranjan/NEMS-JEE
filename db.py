import oracledb
import os

# Connection config — pulls from environment or falls back to default
DB_USER = os.environ.get("DB_USER", "test")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "test")
DB_DSN = os.environ.get("DB_DSN", "localhost:1521/XEPDB1")

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = oracledb.create_pool(
            user=DB_USER,
            password=DB_PASSWORD,
            dsn=DB_DSN,
            min=2,
            max=10,
            increment=1
        )
    return _pool


def query(sql, params=None):
    """Execute a SELECT and return list of dicts."""
    pool = get_pool()
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            cols = [c[0].lower() for c in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]


def query_one(sql, params=None):
    """Execute a SELECT and return first row as dict, or None."""
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=None):
    """Execute INSERT/UPDATE/DELETE. Returns rowcount."""
    pool = get_pool()
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            conn.commit()
            return cur.rowcount


def execute_many(sql, data):
    """Bulk INSERT/UPDATE. data is list of param tuples."""
    pool = get_pool()
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.executemany(sql, data)
            conn.commit()


def callproc(proc_name, params=None):
    """Call a stored procedure by name with optional positional params."""
    pool = get_pool()
    with pool.acquire() as conn:
        with conn.cursor() as cur:
            cur.callproc(proc_name, params or [])
            conn.commit()


def next_id(prefix, table, id_col):
    """Generate a simple sequential ID like TKT004."""
    row = query_one(f"SELECT MAX({id_col}) AS mx FROM {table}")
    if row and row["mx"]:
        num = int(row["mx"].replace(prefix, "")) + 1
    else:
        num = 1
    return f"{prefix}{num:03d}"

_PLSQL_KEYWORDS = (
    "CREATE OR REPLACE PROCEDURE",
    "CREATE OR REPLACE FUNCTION",
    "CREATE OR REPLACE TRIGGER",
    "CREATE OR REPLACE PACKAGE",
    "CREATE OR REPLACE TYPE",
    "DECLARE",
)


def run_sql_file(filepath):
    """Execute a SQL/PL/SQL file.

    Plain SQL statements are terminated by ';'.
    PL/SQL blocks (procedures, triggers, …) are terminated by a '/' on its
    own line — internal semicolons are accumulated as part of the block.
    """
    pool = get_pool()

    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    statement = ""
    in_plsql = False

    with pool.acquire() as conn:
        with conn.cursor() as cur:
            for raw in lines:
                line = raw.strip()

                # Skip blank lines and line comments
                if not line or line.startswith("--"):
                    continue
                # Skip SQL*Plus meta-commands
                if line.upper().startswith("PROMPT"):
                    continue

                # Detect the start of a PL/SQL block
                upper = line.upper()
                if any(upper.startswith(kw) for kw in _PLSQL_KEYWORDS):
                    in_plsql = True

                # '/' alone on a line terminates a PL/SQL block
                if line == "/":
                    stmt = statement.strip()
                    if stmt:
                        try:
                            cur.execute(stmt)
                        except Exception as e:
                            print("\n❌ Error executing PL/SQL block:")
                            print(stmt[:300])
                            print(e)
                    statement = ""
                    in_plsql = False
                    continue

                statement += " " + line

                # Inside a PL/SQL block, ';' is part of the body — don't split
                if not in_plsql and line.endswith(";"):
                    stmt = statement.strip()[:-1]  # strip trailing ;
                    if stmt:
                        try:
                            cur.execute(stmt)
                        except Exception as e:
                            print("\n❌ Error executing SQL statement:")
                            print(stmt[:300])
                            print(e)
                    statement = ""

            conn.commit()

if __name__ == "__main__":
    get_pool()

    # Run schema first
    run_sql_file("schema.sql")

    # Then seed data
    run_sql_file("seed_data.sql")

    print("Database setup complete!")