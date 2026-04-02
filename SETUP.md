# JEE Allotment System — Comprehensive Setup Guide

Welcome to the JEE Allotment System project! This guide will walk you through setting up safely from scratch. This project requires Python for the backend and an Oracle Database for the data layer.

## Prerequisites

1. **Oracle Database 21c Express Edition (XE)** installed and running.
2. **Python 3.10+**
   - *Note: Ensure you install Python directly from [python.org/downloads](https://www.python.org/downloads/) rather than the Microsoft Store, as the App Store version sometimes restricts administrative `pip` commands.*
   - Tip: Check the box **"Add Python to PATH"** during installation.

---

## Step 1: Database Configuration

Before we can interact with the app, we need to create a dedicated user and populate our schema in Oracle.

### 1A. Create the Database User
Open your SQL terminal (`SQL*Plus` or `SQLcl`) and connect as a system administrator:

```sql
conn / as sysdba;
```

Now, configure the workspace by creating the `test` user and assigning the necessary permissions:

```sql
-- Connect to the pluggable database
ALTER SESSION SET CONTAINER = XEPDB1;

-- Create the user
CREATE USER test IDENTIFIED BY test;

-- Grant basic connectivity and resource management
GRANT CREATE SESSION TO test;
GRANT CONNECT, RESOURCE TO test;

-- Grant specific creation rights
GRANT CREATE TABLE, CREATE VIEW, CREATE TRIGGER, CREATE PROCEDURE TO test;

-- Allow the user to store data in their tables
ALTER USER test QUOTA UNLIMITED ON users;
GRANT UNLIMITED TABLESPACE TO test;
```

### 1B. Initialize the Schema and Dummy Data
Connect to your freshly created database user:

```sql
conn test/test@localhost:1521/XEPDB1
```

Now, securely execute the three foundation SQL files. **Please ensure you replace the bolded paths with the exact paths where your project resides on your machine:**

```sql
@"C:\path\to\your\project\schema.sql"
@"C:\path\to\your\project\seed_data.sql"
@"C:\path\to\your\project\ptv.sql"
```

*`schema.sql` builds the tables, `seed_data.sql` inserts dummy testing data, and `ptv.sql` constructs the vital views, procedures, and triggers.*

**Verify the setup by running:**
```sql
SELECT table_name FROM user_tables ORDER BY table_name;
```

---

## Step 2: Start the Web App Backend

### Option A: The Easy Way (Windows)
Simply double-click the **`run.bat`** file inside the project folder. It will automatically:
1. Locate your Python installation.
2. Install necessary dependencies (`flask` and `oracledb`).
3. Start the local server.

### Option B: The Manual Way (Terminal)
Open a Command Prompt or PowerShell in the root directory of the project, then run:

```bash
# Install dependencies
python -m pip install flask oracledb

# Start the application
python app.py
```

---

## Step 3: Access the Application

Once the server says it's running, open your web browser and navigate to: **http://localhost:5000**

### 🔑 Demo Accounts

**As a Candidate (Student):**
| Field | Value |
|-------|-------|
| Application No | `240110001` (or any from `240110002` to `008`) |
| Password | `pass123` |

**As an Administrator:**
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

---

## File Structure Reference

```text
miniproject/
├── run.bat           ← Double-click to start
├── app.py            ← Flask backend API Router
├── db.py             ← Oracle DB driver connection
├── schema.sql        ← Generates all 16 DB tables
├── seed_data.sql     ← Realistically generated demo data
├── ptv.sql           ← Procedures, Triggers, and Views
├── requirements.txt  ← Environment dependencies 
├── SETUP.md          ← This file
├── static/
│   ├── style.css     ← Beautiful UI styling
│   └── app.js        ← Interactive Frontend Logic (SPA)
└── templates/
    └── index.html    ← Core DOM Layout
```

---

## Troubleshooting common issues

- **`No module named 'flask'`**: Your Python environment variables are not correctly set. Ensure `pip install flask` successfully finished in the terminal.
- **`DPY-6001: cannot connect to database`**: Your Oracle 21c XE service is not running. Navigate to Windows Services (`services.msc`) and start `OracleServiceXE` and `OracleXETNSListener`.
- **`ORA-xx` on schema load**: If tables already exist, `schema.sql` handles dropping them safely. If it errors out, just run it a second time.
- **Blank page on boot**: Ensure you hit `localhost:5000` via HTTP. Check browser developer console (`F12`) for javascript errors.
