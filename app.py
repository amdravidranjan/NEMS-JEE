from flask import Flask, request, jsonify, render_template, session
import db
import hashlib
from datetime import datetime

import os

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "jee_allotment_secret_key_2024")


def ok(data=None, msg="success"):
    return jsonify({"status": "ok", "msg": msg, "data": data})


def err(msg, code=400):
    return jsonify({"status": "error", "msg": msg}), code


# ── Static SPA shell ──────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
def register():
    d = request.json
    required = ["application_no","first_name","last_name","dob","gender",
                "category","aadhaar_no","email","mobile_no","password",
                "pincode","city","state"]
    for f in required:
        if not d.get(f):
            return err(f"Missing field: {f}")

    # Ensure location exists
    loc = db.query_one("SELECT 1 FROM LOCATION WHERE Pincode=:1", [d["pincode"]])
    if not loc:
        db.execute("INSERT INTO LOCATION VALUES(:1,:2,:3)",
                   [d["pincode"], d["city"], d["state"]])

    existing = db.query_one("SELECT 1 FROM CANDIDATE WHERE Application_No=:1 OR Email=:2",
                            [d["application_no"], d["email"]])
    if existing:
        return err("Application number or email already registered.")

    db.execute("""
        INSERT INTO CANDIDATE VALUES(:1,:2,:3,TO_DATE(:4,'YYYY-MM-DD'),:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17)
    """, [
        d["application_no"], d["first_name"], d["last_name"], d["dob"],
        d["gender"], d["category"], d.get("pwd_status","N"),
        d["aadhaar_no"], d["email"], d["mobile_no"],
        d.get("class12_rollno",""), d.get("class12_year", None),
        d.get("class10_rollno",""), d.get("class10_year", None),
        d.get("state_code",""), d["pincode"],
        d["password"]   # plain for demo; hash in production
    ])
    return ok(msg="Registration successful!")


@app.route("/api/login", methods=["POST"])
def login():
    d = request.json
    role = d.get("role","candidate")

    if role == "admin":
        if d.get("username") == "admin" and d.get("password") == "admin123":
            session["role"] = "admin"
            session["app_no"] = "ADMIN"
            return ok({"role":"admin","name":"Administrator"})
        return err("Invalid admin credentials.")

    cand = db.query_one(
        "SELECT * FROM CANDIDATE WHERE Application_No=:1 AND Password_Hash=:2",
        [d.get("application_no",""), d.get("password","")]
    )
    if not cand:
        return err("Invalid application number or password.")
    session["role"] = "candidate"
    session["app_no"] = cand["application_no"]
    return ok({"role":"candidate", "name": cand["first_name"], "app_no": cand["application_no"]})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return ok(msg="Logged out.")


@app.route("/api/me")
def me():
    if "app_no" not in session:
        return err("Not logged in.", 401)
    return ok({"role": session["role"], "app_no": session["app_no"]})


# ── Candidate ─────────────────────────────────────────────────────────────────

@app.route("/api/candidate/<app_no>")
def get_candidate(app_no):
    c = db.query_one("""
        SELECT c.*, l.City, l.State
        FROM CANDIDATE c LEFT JOIN LOCATION l ON c.Pincode=l.Pincode
        WHERE c.Application_No=:1
    """, [app_no])
    if not c:
        return err("Candidate not found.", 404)
    c.pop("password_hash", None)
    return ok(c)


@app.route("/api/candidates")
def list_candidates():
    rows = db.query("""
        SELECT Application_No, First_Name, Last_Name, Email, Category, Gender,
               Mobile_No, Pincode
        FROM CANDIDATE ORDER BY Application_No
    """)
    return ok(rows)


# ── Sessions / Shifts / Centers ───────────────────────────────────────────────

@app.route("/api/sessions")
def get_sessions():
    return ok(db.query("SELECT * FROM EXAM_SESSION ORDER BY Session_ID"))


@app.route("/api/sessions", methods=["POST"])
def add_session():
    d = request.json
    db.execute("INSERT INTO EXAM_SESSION VALUES(:1,:2)", [d["session_id"], d["session_name"]])
    return ok(msg="Session added.")


@app.route("/api/shifts")
def get_shifts():
    sid = request.args.get("session_id")
    if sid:
        rows = db.query("""
            SELECT s.*, e.Session_Name FROM SHIFT s
            JOIN EXAM_SESSION e ON s.Session_ID=e.Session_ID
            WHERE s.Session_ID=:1 ORDER BY s.Shift_Date
        """, [sid])
    else:
        rows = db.query("""
            SELECT s.*, e.Session_Name FROM SHIFT s
            JOIN EXAM_SESSION e ON s.Session_ID=e.Session_ID
            ORDER BY s.Shift_Date
        """)
    # Format dates
    for r in rows:
        if r.get("shift_date"):
            r["shift_date"] = str(r["shift_date"])[:10]
    return ok(rows)


@app.route("/api/shifts", methods=["POST"])
def add_shift():
    d = request.json
    db.execute("""
        INSERT INTO SHIFT VALUES(:1,:2,TO_DATE(:3,'YYYY-MM-DD'),:4,:5,0)
    """, [d["shift_id"], d["session_id"], d["shift_date"], d["shift_timing"], d.get("paper_type","")])
    return ok(msg="Shift added.")


@app.route("/api/centers")
def get_centers():
    return ok(db.query("""
        SELECT c.*, l.City, l.State FROM EXAM_CENTER c
        LEFT JOIN LOCATION l ON c.Center_PIN=l.Pincode
        ORDER BY c.Center_Name
    """))


@app.route("/api/centers", methods=["POST"])
def add_center():
    d = request.json
    loc = db.query_one("SELECT 1 FROM LOCATION WHERE Pincode=:1", [d["center_pin"]])
    if not loc:
        db.execute("INSERT INTO LOCATION VALUES(:1,:2,:3)", [d["center_pin"], d["city"], d["state"]])
    db.execute("INSERT INTO EXAM_CENTER VALUES(:1,:2,:3,:4)",
               [d["center_id"], d["center_name"], d["center_pin"], d["capacity"]])
    return ok(msg="Center added.")


# ── Exam Attempt ──────────────────────────────────────────────────────────────

@app.route("/api/attempts/<app_no>")
def get_attempts(app_no):
    rows = db.query("""
        SELECT a.*, s.Shift_Date, s.Shift_Timing, s.Paper_Type,
               es.Session_Name, c.Center_Name
        FROM EXAM_ATTEMPT a
        JOIN SHIFT s ON a.Shift_ID=s.Shift_ID
        JOIN EXAM_SESSION es ON a.Session_ID=es.Session_ID
        JOIN EXAM_CENTER c ON a.Center_ID=c.Center_ID
        WHERE a.Application_No=:1
        ORDER BY s.Shift_Date
    """, [app_no])
    for r in rows:
        if r.get("shift_date"):
            r["shift_date"] = str(r["shift_date"])[:10]
    return ok(rows)


@app.route("/api/attempts", methods=["POST"])
def book_attempt():
    d = request.json
    app_no = d.get("application_no") or session.get("app_no")
    if not app_no:
        return err("Not logged in.", 401)

    existing = db.query_one(
        "SELECT 1 FROM EXAM_ATTEMPT WHERE Application_No=:1 AND Session_ID=:2",
        [app_no, d["session_id"]]
    )
    if existing:
        return err("Already booked for this session.")

    attempt_id = db.next_id("ATT2024", "EXAM_ATTEMPT", "Attempt_ID")
    db.execute("""
        INSERT INTO EXAM_ATTEMPT(Attempt_ID,Session_ID,Application_No,Shift_ID,Center_ID,Attendance_Status)
        VALUES(:1,:2,:3,:4,:5,'N')
    """, [attempt_id, d["session_id"], app_no, d["shift_id"], d["center_id"]])
    return ok({"attempt_id": attempt_id}, msg="Exam slot booked successfully!")


@app.route("/api/attempts/<attempt_id>/attend", methods=["PUT"])
def mark_attendance(attempt_id):
    db.execute("UPDATE EXAM_ATTEMPT SET Attendance_Status='Y' WHERE Attempt_ID=:1", [attempt_id])
    return ok(msg="Attendance marked.")


# ── Questions ─────────────────────────────────────────────────────────────────

@app.route("/api/questions")
def get_questions():
    subject = request.args.get("subject")
    if subject:
        rows = db.query("SELECT * FROM QUESTION WHERE Subject=:1 ORDER BY Question_ID", [subject])
    else:
        rows = db.query("SELECT * FROM QUESTION ORDER BY Subject, Question_ID")
    return ok(rows)


@app.route("/api/questions", methods=["POST"])
def add_question():
    d = request.json
    db.execute("INSERT INTO QUESTION VALUES(:1,:2,:3,:4,'N')",
               [d["question_id"], d["subject"], d["q_type"], d["correct_ans"]])
    return ok(msg="Question added.")


@app.route("/api/questions/<qid>", methods=["PUT"])
def update_question(qid):
    d = request.json
    db.execute("UPDATE QUESTION SET Correct_Ans=:1, Is_Dropped=:2 WHERE Question_ID=:3",
               [d.get("correct_ans"), d.get("is_dropped","N"), qid])
    _recalculate_after_question_change(qid)
    return ok(msg="Question updated.")


# ── Responses ─────────────────────────────────────────────────────────────────

@app.route("/api/responses/<attempt_id>")
def get_responses(attempt_id):
    return ok(db.query("""
        SELECT r.*, q.Subject, q.Q_Type, q.Correct_Ans, q.Is_Dropped
        FROM RESPONSE r JOIN QUESTION q ON r.Question_ID=q.Question_ID
        WHERE r.Attempt_ID=:1 ORDER BY q.Subject, r.Question_ID
    """, [attempt_id]))


@app.route("/api/responses", methods=["POST"])
def submit_responses():
    d = request.json
    attempt_id = d["attempt_id"]
    responses = d["responses"]  # list of {question_id, candidate_answer}

    questions = {q["question_id"]: q for q in db.query("SELECT * FROM QUESTION")}
    inserts = []
    for i, r in enumerate(responses):
        qid = r["question_id"]
        ans = r.get("candidate_answer", "")
        q = questions.get(qid, {})
        correct = q.get("correct_ans", "")
        if q.get("is_dropped") == "Y":
            status = "Dropped"
        elif not ans:
            status = "Not Attempted"
        elif ans == correct:
            status = "Correct"
        else:
            status = "Wrong"
        resp_id = f"RSP{attempt_id[-3:]}{i+1:03d}"
        inserts.append((resp_id, attempt_id, qid, ans, status))

    db.execute_many("""
        INSERT INTO RESPONSE(Response_ID,Attempt_ID,Question_ID,Candidate_Answer,Status)
        VALUES(:1,:2,:3,:4,:5)
    """, inserts)

    db.execute("UPDATE EXAM_ATTEMPT SET Attendance_Status='Y' WHERE Attempt_ID=:1", [attempt_id])
    _calculate_score(attempt_id)
    return ok(msg="Responses submitted and score calculated!")


def _calculate_score(attempt_id):
    responses = db.query("""
        SELECT r.Status, q.Subject FROM RESPONSE r
        JOIN QUESTION q ON r.Question_ID=q.Question_ID
        WHERE r.Attempt_ID=:1
    """, [attempt_id])

    scores = {"Math": 0, "Physics": 0, "Chemistry": 0}
    for r in responses:
        subj = r["subject"]
        if r["status"] in ("Correct", "Dropped"):
            scores[subj] = scores.get(subj, 0) + 4
        elif r["status"] == "Wrong":
            scores[subj] = scores.get(subj, 0) - 1

    total = sum(scores.values())
    existing = db.query_one("SELECT 1 FROM SCORE WHERE Attempt_ID=:1", [attempt_id])
    if existing:
        db.execute("""
            UPDATE SCORE SET Math_Raw=:1, Phy_Raw=:2, Chem_Raw=:3, Total_Raw=:4
            WHERE Attempt_ID=:5
        """, [scores["Math"], scores["Physics"], scores["Chemistry"], total, attempt_id])
    else:
        db.execute("""
            INSERT INTO SCORE(Attempt_ID,Math_Raw,Phy_Raw,Chem_Raw,Total_Raw,
                              Math_Percentile,Phy_Percentile,Chem_Percentile,Total_Percentile)
            VALUES(:1,:2,:3,:4,:5,0,0,0,0)
        """, [attempt_id, scores["Math"], scores["Physics"], scores["Chemistry"], total])


def _recalculate_after_question_change(qid):
    attempts = db.query("SELECT DISTINCT Attempt_ID FROM RESPONSE WHERE Question_ID=:1", [qid])
    if not attempts:
        return
        
    for a in attempts:
        _calculate_score(a["attempt_id"])
        
    sessions = db.query("""
        SELECT DISTINCT ea.Session_ID
        FROM EXAM_ATTEMPT ea
        JOIN RESPONSE r ON ea.Attempt_ID = r.Attempt_ID
        WHERE r.Question_ID=:1 AND ea.Session_ID IS NOT NULL
    """, [qid])
    
    for sess in sessions:
        try:
            db.callproc("SP_CALC_PERCENTILES", [sess["session_id"]])
        except Exception:
            pass
            
    try:
        db.callproc("SP_GENERATE_RANKS")
    except Exception:
        pass


# ── Score ─────────────────────────────────────────────────────────────────────

@app.route("/api/score/<attempt_id>")
def get_score(attempt_id):
    s = db.query_one("SELECT * FROM SCORE WHERE Attempt_ID=:1", [attempt_id])
    if not s:
        return err("Score not found.", 404)
    return ok(s)


@app.route("/api/scores/<app_no>")
def get_scores_for_candidate(app_no):
    rows = db.query("""
        SELECT sc.*, ea.Shift_ID, sh.Shift_Date, sh.Session_ID, es.Session_Name
        FROM SCORE sc
        JOIN EXAM_ATTEMPT ea ON sc.Attempt_ID=ea.Attempt_ID
        JOIN SHIFT sh ON ea.Shift_ID=sh.Shift_ID
        JOIN EXAM_SESSION es ON ea.Session_ID=es.Session_ID
        WHERE ea.Application_No=:1
        ORDER BY sh.Shift_Date DESC
    """, [app_no])
    for r in rows:
        if r.get("shift_date"):
            r["shift_date"] = str(r["shift_date"])[:10]
    return ok(rows)


# ── Rank ──────────────────────────────────────────────────────────────────────

@app.route("/api/rank/<app_no>")
def get_rank(app_no):
    r = db.query_one("SELECT * FROM RANK_TABLE WHERE Application_No=:1", [app_no])
    if not r:
        return err("Rank not published yet.", 404)
    return ok(r)


@app.route("/api/ranks/generate", methods=["POST"])
def generate_ranks():
    """Admin: compute AIR and category ranks via stored procedure SP_GENERATE_RANKS."""
    try:
        db.callproc("SP_GENERATE_RANKS")
    except Exception as e:
        return err(f"Rank generation failed: {e}")
    count = (db.query_one("SELECT COUNT(*) AS n FROM RANK_TABLE") or {}).get("n", 0)
    return ok(msg=f"Ranks generated for {count} candidates.")


# ── Stored-Procedure Endpoints ───────────────────────────────────────────────

@app.route("/api/admin/calc-percentiles", methods=["POST"])
def calc_percentiles():
    """Admin: calculate NTA-style percentiles for a session via SP_CALC_PERCENTILES."""
    d = request.json or {}
    session_id = d.get("session_id")
    if not session_id:
        return err("session_id is required.")
    try:
        db.callproc("SP_CALC_PERCENTILES", [session_id])
    except Exception as e:
        return err(f"Percentile calculation failed: {e}")
    return ok(msg=f"Percentiles calculated for session {session_id}.")


@app.route("/api/admin/load-db-objects", methods=["POST"])
def load_db_objects():
    """Admin: (re)create all procedures, triggers and views from SQL file."""
    try:
        db.run_sql_file("ptv.sql")
    except Exception as e:
        return err(f"Failed to load DB objects: {e}")
    return ok(msg="Procedures, triggers and views created successfully.")


# ── Views (DB-side) ───────────────────────────────────────────────────────────

@app.route("/api/views/scorecard")
def view_scorecard():
    """V_CANDIDATE_SCORECARD — best score + rank for every ranked candidate."""
    rows = db.query("SELECT * FROM V_CANDIDATE_SCORECARD ORDER BY AIR")
    return ok(rows)


@app.route("/api/views/scorecard/<app_no>")
def view_scorecard_candidate(app_no):
    row = db.query_one(
        "SELECT * FROM V_CANDIDATE_SCORECARD WHERE Application_No=:1", [app_no]
    )
    if not row:
        return err("Scorecard not available (rank not yet published).", 404)
    return ok(row)


@app.route("/api/views/seats")
def view_seat_availability():
    """V_SEAT_AVAILABILITY — seat matrix with live filled/available counts."""
    inst  = request.args.get("institute")
    quota = request.args.get("quota")
    conditions, params, pidx = [], [], 1
    if inst:
        conditions.append(f"Institute_Code=:{pidx}"); params.append(inst); pidx += 1
    if quota:
        conditions.append(f"Quota=:{pidx}"); params.append(quota); pidx += 1
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = db.query(
        f"SELECT * FROM V_SEAT_AVAILABILITY {where} ORDER BY Institute_Name, Program_Name",
        params
    )
    return ok(rows)


@app.route("/api/views/allotments")
def view_allotments_full():
    """V_ALLOTMENT_FULL — complete allotment picture joined with rank/institute/program."""
    rows = db.query("SELECT * FROM V_ALLOTMENT_FULL ORDER BY AIR")
    for r in rows:
        if r.get("allotment_date"):
            r["allotment_date"] = str(r["allotment_date"])[:10]
    return ok(rows)


@app.route("/api/views/center-load")
def view_center_load():
    """V_CENTER_LOAD — exam centre bookings vs capacity."""
    return ok(db.query("SELECT * FROM V_CENTER_LOAD ORDER BY Load_Pct DESC"))


# ── Seat Matrix ───────────────────────────────────────────────────────────────

@app.route("/api/seat-matrix")
def get_seat_matrix():
    inst = request.args.get("institute")
    prog = request.args.get("program")
    quota = request.args.get("quota")
    seat_type = request.args.get("seat_type")

    cand_state = ""
    role = session.get("role")
    if role == "candidate":
        app_no = session.get("app_no")
        cand = db.query_one("SELECT State_Code_Eligibility FROM CANDIDATE WHERE Application_No=:1", [app_no])
        if cand:
            cand_state = cand.get("state_code_eligibility", "")

    conditions = []
    params = []
    pidx = 1

    if inst:
        conditions.append(f"sm.Institute_Code=:{pidx}")
        params.append(inst)
        pidx += 1
    if prog:
        conditions.append(f"sm.Program_Code=:{pidx}")
        params.append(prog)
        pidx += 1
    if quota:
        conditions.append(f"sm.Quota=:{pidx}")
        params.append(quota)
        pidx += 1
    if seat_type:
        conditions.append(f"sm.Seat_Type=:{pidx}")
        params.append(seat_type)
        pidx += 1

    if cand_state:
        conditions.append(f"(sm.Quota = 'AI' OR (sm.Quota = 'HS' AND i.State_Code = :{pidx}) OR (sm.Quota = 'OS' AND i.State_Code != :{pidx+1}))")
        params.append(cand_state)
        params.append(cand_state)
        pidx += 2

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    rows = db.query(f"""
        SELECT sm.*, i.Institute_Name, p.Program_Name
        FROM SEAT_MATRIX sm
        JOIN INSTITUTE i ON sm.Institute_Code=i.Institute_Code
        JOIN PROGRAM p ON sm.Program_Code=p.Program_Code
        {where}
        ORDER BY sm.Opening_Rank
    """, params)
    return ok(rows)


@app.route("/api/seat-matrix", methods=["POST"])
def add_seat_matrix():
    d = request.json
    db.execute("""
        INSERT INTO SEAT_MATRIX VALUES(:1,:2,:3,:4,:5,:6,:7,:8,:9)
    """, [d["seatmatrix_id"], d["institute_code"], d["program_code"],
          d["quota"], d["seat_type"], d["gender"],
          d["opening_rank"], d["closing_rank"], d["available_seats"]])
    return ok(msg="Seat matrix entry added.")


@app.route("/api/seat-matrix/<sm_id>", methods=["PUT"])
def update_seat_matrix(sm_id):
    d = request.json
    db.execute("""
        UPDATE SEAT_MATRIX SET Opening_Rank=:1, Closing_Rank=:2, Available_Seats=:3
        WHERE SeatMatrix_ID=:4
    """, [d["opening_rank"], d["closing_rank"], d["available_seats"], sm_id])
    return ok(msg="Seat matrix updated.")


# ── Institutes & Programs ─────────────────────────────────────────────────────

@app.route("/api/institutes")
def get_institutes():
    return ok(db.query("SELECT * FROM INSTITUTE ORDER BY Institute_Name"))


@app.route("/api/institutes", methods=["POST"])
def add_institute():
    d = request.json
    db.execute("INSERT INTO INSTITUTE VALUES(:1,:2,:3)", [d["institute_code"], d["institute_name"], d.get("state_code", "")])
    return ok(msg="Institute added.")


@app.route("/api/programs")
def get_programs():
    return ok(db.query("SELECT * FROM PROGRAM ORDER BY Program_Name"))


@app.route("/api/programs", methods=["POST"])
def add_program():
    d = request.json
    db.execute("INSERT INTO PROGRAM VALUES(:1,:2)", [d["program_code"], d["program_name"]])
    return ok(msg="Program added.")


# ── Allotment ─────────────────────────────────────────────────────────────────

@app.route("/api/allotment/<app_no>")
def get_allotment(app_no):
    row = db.query_one("""
        SELECT a.*, sm.Institute_Code, sm.Program_Code, sm.Quota, sm.Seat_Type,
               i.Institute_Name, p.Program_Name, sm.Opening_Rank, sm.Closing_Rank
        FROM ALLOTMENT a
        JOIN SEAT_MATRIX sm ON a.SeatMatrix_ID=sm.SeatMatrix_ID
        JOIN INSTITUTE i ON sm.Institute_Code=i.Institute_Code
        JOIN PROGRAM p ON sm.Program_Code=p.Program_Code
        WHERE a.Application_No=:1
    """, [app_no])
    if not row:
        return ok(None, msg="No allotment found.")
    if row.get("allotment_date"):
        row["allotment_date"] = str(row["allotment_date"])[:10]
    return ok(row)


@app.route("/api/allotments")
def list_allotments():
    rows = db.query("""
        SELECT a.Application_No, c.First_Name||' '||c.Last_Name AS Name,
               a.SeatMatrix_ID, i.Institute_Name, p.Program_Name,
               sm.Quota, sm.Seat_Type, a.Round_No, a.Allotment_Date
        FROM ALLOTMENT a
        JOIN CANDIDATE c ON a.Application_No=c.Application_No
        JOIN SEAT_MATRIX sm ON a.SeatMatrix_ID=sm.SeatMatrix_ID
        JOIN INSTITUTE i ON sm.Institute_Code=i.Institute_Code
        JOIN PROGRAM p ON sm.Program_Code=p.Program_Code
        ORDER BY a.Round_No, a.Allotment_Date
    """)
    for r in rows:
        if r.get("allotment_date"):
            r["allotment_date"] = str(r["allotment_date"])[:10]
    return ok(rows)


@app.route("/api/allotment", methods=["POST"])
def create_allotment():
    d = request.json
    app_no = d["application_no"]
    sm_id = d["seatmatrix_id"]
    
    # --- Home State Validation Logic ---
    cand = db.query_one("SELECT State_Code_Eligibility FROM CANDIDATE WHERE Application_No=:1", [app_no])
    if not cand:
        return err("Candidate not found.")
    cand_state = cand.get("state_code_eligibility", "")
    
    sm = db.query_one("""
        SELECT sm.Quota, i.State_Code 
        FROM SEAT_MATRIX sm
        JOIN INSTITUTE i ON sm.Institute_Code = i.Institute_Code
        WHERE sm.SeatMatrix_ID=:1
    """, [sm_id])
    if not sm:
        return err("Seat matrix entry not found.")
    
    quota = sm.get("quota", "")
    inst_state = sm.get("state_code", "")
    
    if quota == "HS" and cand_state != inst_state:
        return err("Candidate not eligible for Home State quota for this institute.")
    if quota == "OS" and cand_state == inst_state:
        return err("Candidate not eligible for Other State quota for this institute (Home State matches).")
    # -------------------------------------

    existing = db.query_one("SELECT 1 FROM ALLOTMENT WHERE Application_No=:1", [app_no])
    try:
        if existing:
            db.execute("""
                UPDATE ALLOTMENT SET SeatMatrix_ID=:1, Round_No=:2, Allotment_Date=SYSDATE
                WHERE Application_No=:3
            """, [sm_id, d.get("round_no", 1), app_no])
        else:
            db.execute("""
                INSERT INTO ALLOTMENT(Application_No,SeatMatrix_ID,Round_No,Allotment_Date)
                VALUES(:1,:2,:3,SYSDATE)
            """, [app_no, sm_id, d.get("round_no", 1)])
    except Exception as e:
        # Catches ORA-20010/20011/20012 raised by TRG_ALLOTMENT_VALIDATE
        msg = str(e)
        if "ORA-20" in msg:
            # Extract the human-readable part after ORA-20xxx:
            import re
            m = re.search(r'ORA-20\d+: (.+?)(?:\n|ORA-|$)', msg, re.DOTALL)
            return err(m.group(1).strip() if m else msg)
        return err(f"Allotment failed: {msg}")
    return ok(msg="Allotment recorded.")


@app.route("/api/allotment/<app_no>", methods=["DELETE"])
def delete_allotment(app_no):
    db.execute("DELETE FROM ALLOTMENT WHERE Application_No=:1", [app_no])
    return ok(msg="Allotment removed.")


# ── Support Tickets ───────────────────────────────────────────────────────────

@app.route("/api/tickets/<app_no>")
def get_tickets(app_no):
    rows = db.query("""
        SELECT * FROM SUPPORT_TICKET WHERE Application_No=:1
        ORDER BY Created_At DESC
    """, [app_no])
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])[:19]
    return ok(rows)


@app.route("/api/tickets/all")
def get_all_tickets():
    rows = db.query("""
        SELECT t.*, c.First_Name||' '||c.Last_Name AS Candidate_Name
        FROM SUPPORT_TICKET t JOIN CANDIDATE c ON t.Application_No=c.Application_No
        ORDER BY t.Created_At DESC
    """)
    for r in rows:
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])[:19]
    return ok(rows)


@app.route("/api/tickets", methods=["POST"])
def create_ticket():
    d = request.json
    app_no = d.get("application_no") or session.get("app_no")
    tid = db.next_id("TKT", "SUPPORT_TICKET", "Ticket_ID")
    db.execute("""
        INSERT INTO SUPPORT_TICKET(Ticket_ID,Application_No,Category,Description,Status)
        VALUES(:1,:2,:3,:4,'Open')
    """, [tid, app_no, d["category"], d["description"]])
    return ok({"ticket_id": tid}, msg="Ticket raised successfully!")


@app.route("/api/tickets/<ticket_id>/status", methods=["PUT"])
def update_ticket_status(ticket_id):
    d = request.json
    db.execute("UPDATE SUPPORT_TICKET SET Status=:1 WHERE Ticket_ID=:2",
               [d["status"], ticket_id])
    return ok(msg="Ticket updated.")


# ── Answer Key Challenges ─────────────────────────────────────────────────────

@app.route("/api/challenges/<app_no>")
def get_challenges(app_no):
    rows = db.query("""
        SELECT ch.*, q.Subject, q.Q_Type, q.Correct_Ans
        FROM ANSWER_CHALLENGE ch JOIN QUESTION q ON ch.Question_ID=q.Question_ID
        WHERE ch.Application_No=:1
        ORDER BY ch.Challenge_ID
    """, [app_no])
    return ok(rows)


@app.route("/api/challenges/all")
def get_all_challenges():
    rows = db.query("""
        SELECT ch.*, q.Subject, q.Correct_Ans,
               c.First_Name||' '||c.Last_Name AS Candidate_Name
        FROM ANSWER_CHALLENGE ch
        JOIN QUESTION q ON ch.Question_ID=q.Question_ID
        JOIN CANDIDATE c ON ch.Application_No=c.Application_No
        ORDER BY ch.Challenge_ID
    """)
    return ok(rows)


@app.route("/api/challenges", methods=["POST"])
def create_challenge():
    d = request.json
    app_no = d.get("application_no") or session.get("app_no")
    cid = db.next_id("CHG", "ANSWER_CHALLENGE", "Challenge_ID")
    db.execute("""
        INSERT INTO ANSWER_CHALLENGE VALUES(:1,:2,:3,:4,:5,:6,'Pending')
    """, [cid, app_no, d["question_id"], d["claimed_ans"],
          d.get("document_path",""), d.get("fee_transaction_id","")])
    return ok({"challenge_id": cid}, msg="Challenge submitted!")


@app.route("/api/challenges/<cid>/status", methods=["PUT"])
def update_challenge_status(cid):
    d = request.json
    db.execute("UPDATE ANSWER_CHALLENGE SET Challenge_Status=:1 WHERE Challenge_ID=:2",
               [d["status"], cid])
    return ok(msg="Challenge status updated.")


@app.route("/api/challenges/<cid>/resolve", methods=["PUT"])
def resolve_challenge(cid):
    """Admin: resolve a challenge via SP_RESOLVE_CHALLENGE."""
    d = request.json or {}
    new_status = d.get("status")
    if new_status not in ("Accepted", "Rejected"):
        return err("status must be 'Accepted' or 'Rejected'.")
        
    chal = db.query_one("SELECT Question_ID FROM ANSWER_CHALLENGE WHERE Challenge_ID=:1", [cid])
    if not chal:
        return err("Challenge not found.", 404)
        
    try:
        db.callproc("SP_RESOLVE_CHALLENGE", [cid, new_status])
        if new_status == "Accepted":
            _recalculate_after_question_change(chal["question_id"])
    except Exception as e:
        return err(f"Challenge resolution failed: {e}")
    return ok(msg=f"Challenge {cid} {new_status.lower()}.")

# ── Admin Stats ───────────────────────────────────────────────────────────────

@app.route("/api/stats")
def get_stats():
    stats = {
        "total_candidates": (db.query_one("SELECT COUNT(*) AS n FROM CANDIDATE") or {}).get("n", 0),
        "total_attempts":   (db.query_one("SELECT COUNT(*) AS n FROM EXAM_ATTEMPT") or {}).get("n", 0),
        "ranked_candidates":(db.query_one("SELECT COUNT(*) AS n FROM RANK_TABLE") or {}).get("n", 0),
        "allotments":       (db.query_one("SELECT COUNT(*) AS n FROM ALLOTMENT") or {}).get("n", 0),
        "open_tickets":     (db.query_one("SELECT COUNT(*) AS n FROM SUPPORT_TICKET WHERE Status='Open'") or {}).get("n", 0),
        "pending_challenges":(db.query_one("SELECT COUNT(*) AS n FROM ANSWER_CHALLENGE WHERE Challenge_Status='Pending'") or {}).get("n", 0),
    }
    return ok(stats)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
