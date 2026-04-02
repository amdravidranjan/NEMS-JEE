-- ============================================================
-- JEE Allotment System -- Procedures, Triggers & Views
-- Run in SQL*Plus AFTER seed_data.sql: @procedures_triggers_views.sql
-- Or via the admin panel: POST /api/admin/load-db-objects
-- ============================================================

-- ============================================================
-- VIEWS
-- ============================================================

-- V1: Candidate scorecard — best attempt + published rank
CREATE OR REPLACE VIEW V_CANDIDATE_SCORECARD AS
SELECT
    c.Application_No,
    c.First_Name || ' ' || c.Last_Name  AS Full_Name,
    c.Category,
    c.Gender,
    c.State_Code_Eligibility             AS Home_State,
    best.Math_Raw,
    best.Phy_Raw,
    best.Chem_Raw,
    best.Total_Raw,
    best.Total_Percentile                AS Best_Percentile,
    rt.AIR,
    rt.Category_Rank
FROM CANDIDATE c
JOIN RANK_TABLE rt ON c.Application_No = rt.Application_No
JOIN (
    SELECT
        ea.Application_No,
        sc.Math_Raw,
        sc.Phy_Raw,
        sc.Chem_Raw,
        sc.Total_Raw,
        sc.Total_Percentile,
        RANK() OVER (PARTITION BY ea.Application_No
                     ORDER BY sc.Total_Percentile DESC) AS rn
    FROM SCORE sc
    JOIN EXAM_ATTEMPT ea ON sc.Attempt_ID = ea.Attempt_ID
) best ON c.Application_No = best.Application_No AND best.rn = 1;

-- V2: Seat availability (Available_Seats + live Seats_Filled from ALLOTMENT)
CREATE OR REPLACE VIEW V_SEAT_AVAILABILITY AS
SELECT
    sm.SeatMatrix_ID,
    i.Institute_Code,
    i.Institute_Name,
    i.State_Code                          AS Institute_State,
    p.Program_Code,
    p.Program_Name,
    sm.Quota,
    sm.Seat_Type,
    sm.Gender,
    sm.Opening_Rank,
    sm.Closing_Rank,
    sm.Available_Seats,
    NVL((SELECT COUNT(*) FROM ALLOTMENT a
         WHERE a.SeatMatrix_ID = sm.SeatMatrix_ID), 0) AS Seats_Filled
FROM SEAT_MATRIX sm
JOIN INSTITUTE i ON sm.Institute_Code = i.Institute_Code
JOIN PROGRAM   p ON sm.Program_Code   = p.Program_Code;

-- V3: Full allotment view (candidate + seat + rank details)
CREATE OR REPLACE VIEW V_ALLOTMENT_FULL AS
SELECT
    a.Application_No,
    c.First_Name || ' ' || c.Last_Name  AS Candidate_Name,
    c.Category,
    c.Gender,
    c.State_Code_Eligibility             AS Home_State,
    rt.AIR,
    i.Institute_Code,
    i.Institute_Name,
    i.State_Code                         AS Institute_State,
    p.Program_Code,
    p.Program_Name,
    sm.Quota,
    sm.Seat_Type,
    sm.Opening_Rank,
    sm.Closing_Rank,
    a.Round_No,
    a.Allotment_Date
FROM ALLOTMENT   a
JOIN CANDIDATE   c  ON a.Application_No  = c.Application_No
JOIN SEAT_MATRIX sm ON a.SeatMatrix_ID   = sm.SeatMatrix_ID
JOIN INSTITUTE   i  ON sm.Institute_Code = i.Institute_Code
JOIN PROGRAM     p  ON sm.Program_Code   = p.Program_Code
LEFT JOIN RANK_TABLE rt ON a.Application_No = rt.Application_No;

-- V4: Exam centre load (bookings vs capacity)
CREATE OR REPLACE VIEW V_CENTER_LOAD AS
SELECT
    ec.Center_ID,
    ec.Center_Name,
    l.City,
    l.State,
    ec.Center_Capacity,
    COUNT(ea.Attempt_ID)                                       AS Total_Bookings,
    ROUND(COUNT(ea.Attempt_ID) / ec.Center_Capacity * 100, 1) AS Load_Pct
FROM EXAM_CENTER  ec
LEFT JOIN LOCATION     l  ON ec.Center_PIN = l.Pincode
LEFT JOIN EXAM_ATTEMPT ea ON ec.Center_ID  = ea.Center_ID
GROUP BY ec.Center_ID, ec.Center_Name, l.City, l.State, ec.Center_Capacity;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

-- SP1: Calculate NTA-style percentiles for every score in a session.
--      Uses PERCENT_RANK() per subject and overall, then MERGEs into SCORE.
CREATE OR REPLACE PROCEDURE SP_CALC_PERCENTILES (
    p_session_id IN VARCHAR2
) AS
BEGIN
    MERGE INTO SCORE s
    USING (
        SELECT
            sc.Attempt_ID,
            ROUND(PERCENT_RANK() OVER (ORDER BY sc.Math_Raw)  * 100, 4) AS math_pct,
            ROUND(PERCENT_RANK() OVER (ORDER BY sc.Phy_Raw)   * 100, 4) AS phy_pct,
            ROUND(PERCENT_RANK() OVER (ORDER BY sc.Chem_Raw)  * 100, 4) AS chem_pct,
            ROUND(PERCENT_RANK() OVER (ORDER BY sc.Total_Raw) * 100, 4) AS total_pct
        FROM SCORE sc
        JOIN EXAM_ATTEMPT ea ON sc.Attempt_ID = ea.Attempt_ID
        WHERE ea.Session_ID = p_session_id
    ) src ON (s.Attempt_ID = src.Attempt_ID)
    WHEN MATCHED THEN UPDATE SET
        s.Math_Percentile  = src.math_pct,
        s.Phy_Percentile   = src.phy_pct,
        s.Chem_Percentile  = src.chem_pct,
        s.Total_Percentile = src.total_pct;

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Percentiles updated for session: ' || p_session_id);
END SP_CALC_PERCENTILES;
/

-- SP2: Compute AIR and per-category ranks from each candidate's best
--      Total_Percentile across all sessions.
CREATE OR REPLACE PROCEDURE SP_GENERATE_RANKS AS
    v_count NUMBER;
BEGIN
    DELETE FROM RANK_TABLE;

    INSERT INTO RANK_TABLE (Application_No, Best_Total_NTA, AIR, Category_Rank)
    SELECT
        Application_No,
        best_pct,
        RANK() OVER (ORDER BY best_pct DESC)                       AS AIR,
        RANK() OVER (PARTITION BY Category ORDER BY best_pct DESC) AS Category_Rank
    FROM (
        SELECT
            ea.Application_No,
            c.Category,
            MAX(sc.Total_Percentile) AS best_pct
        FROM SCORE sc
        JOIN EXAM_ATTEMPT ea ON sc.Attempt_ID     = ea.Attempt_ID
        JOIN CANDIDATE    c  ON ea.Application_No = c.Application_No
        GROUP BY ea.Application_No, c.Category
    );

    v_count := SQL%ROWCOUNT;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Ranks generated for ' || v_count || ' candidate(s).');
END SP_GENERATE_RANKS;
/

-- SP3: Resolve an answer key challenge.
--      If Accepted: updates QUESTION.Correct_Ans to the claimed answer and
--      re-evaluates every RESPONSE for that question across all attempts.
CREATE OR REPLACE PROCEDURE SP_RESOLVE_CHALLENGE (
    p_challenge_id IN VARCHAR2,
    p_new_status   IN VARCHAR2   -- 'Accepted' or 'Rejected'
) AS
    v_question_id  ANSWER_CHALLENGE.Question_ID%TYPE;
    v_claimed_ans  ANSWER_CHALLENGE.Claimed_Ans%TYPE;
    v_resp_count   NUMBER;
BEGIN
    SELECT Question_ID, Claimed_Ans
    INTO   v_question_id, v_claimed_ans
    FROM   ANSWER_CHALLENGE
    WHERE  Challenge_ID = p_challenge_id;

    UPDATE ANSWER_CHALLENGE
    SET    Challenge_Status = p_new_status
    WHERE  Challenge_ID = p_challenge_id;

    IF p_new_status = 'Accepted' THEN
        -- Update the question's correct answer
        UPDATE QUESTION
        SET    Correct_Ans = v_claimed_ans
        WHERE  Question_ID = v_question_id;

        -- Re-evaluate every response for that question
        UPDATE RESPONSE
        SET    Status = CASE
                   WHEN Candidate_Answer = v_claimed_ans       THEN 'Correct'
                   WHEN Candidate_Answer IS NULL
                     OR Candidate_Answer = ''                  THEN 'Not Attempted'
                   ELSE 'Wrong'
               END
        WHERE  Question_ID = v_question_id;

        v_resp_count := SQL%ROWCOUNT;
        DBMS_OUTPUT.PUT_LINE(
            'Challenge ' || p_challenge_id || ' accepted. ' ||
            'Q' || v_question_id || ' answer changed to ' || v_claimed_ans || '. ' ||
            v_resp_count || ' response(s) re-evaluated.'
        );
    ELSE
        DBMS_OUTPUT.PUT_LINE('Challenge ' || p_challenge_id || ' rejected.');
    END IF;

    COMMIT;
END SP_RESOLVE_CHALLENGE;
/

-- ============================================================
-- TRIGGERS
-- ============================================================

-- TRG1: Before allotment insert/update — validate candidate's AIR is within
--       the seat's Opening_Rank..Closing_Rank, and seats are available.
CREATE OR REPLACE TRIGGER TRG_ALLOTMENT_VALIDATE
BEFORE INSERT OR UPDATE ON ALLOTMENT
FOR EACH ROW
DECLARE
    v_air      RANK_TABLE.AIR%TYPE;
    v_opening  SEAT_MATRIX.Opening_Rank%TYPE;
    v_closing  SEAT_MATRIX.Closing_Rank%TYPE;
    v_avail    SEAT_MATRIX.Available_Seats%TYPE;
BEGIN
    BEGIN
        SELECT AIR INTO v_air
        FROM   RANK_TABLE
        WHERE  Application_No = :NEW.Application_No;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20010,
                'Candidate ' || :NEW.Application_No ||
                ' has no published rank. Run SP_GENERATE_RANKS first.');
    END;

    SELECT Opening_Rank, Closing_Rank, Available_Seats
    INTO   v_opening, v_closing, v_avail
    FROM   SEAT_MATRIX
    WHERE  SeatMatrix_ID = :NEW.SeatMatrix_ID;

    IF v_air < v_opening OR v_air > v_closing THEN
        RAISE_APPLICATION_ERROR(-20011,
            'Candidate AIR ' || v_air ||
            ' is outside seat rank range [' || v_opening || '-' || v_closing || '].');
    END IF;

    IF INSERTING AND v_avail <= 0 THEN
        RAISE_APPLICATION_ERROR(-20012,
            'No seats available in ' || :NEW.SeatMatrix_ID || '.');
    END IF;
END TRG_ALLOTMENT_VALIDATE;
/

-- TRG2: After allotment insert / delete / seat change — keep Available_Seats
--       in sync automatically.
CREATE OR REPLACE TRIGGER TRG_ALLOTMENT_SEATS
AFTER INSERT OR DELETE OR UPDATE ON ALLOTMENT
FOR EACH ROW
BEGIN
    IF INSERTING THEN
        UPDATE SEAT_MATRIX
        SET    Available_Seats = Available_Seats - 1
        WHERE  SeatMatrix_ID = :NEW.SeatMatrix_ID;

    ELSIF DELETING THEN
        UPDATE SEAT_MATRIX
        SET    Available_Seats = Available_Seats + 1
        WHERE  SeatMatrix_ID = :OLD.SeatMatrix_ID;

    ELSIF UPDATING AND :NEW.SeatMatrix_ID != :OLD.SeatMatrix_ID THEN
        -- Candidate moved to a different seat: free old, occupy new
        UPDATE SEAT_MATRIX
        SET    Available_Seats = Available_Seats + 1
        WHERE  SeatMatrix_ID = :OLD.SeatMatrix_ID;
        UPDATE SEAT_MATRIX
        SET    Available_Seats = Available_Seats - 1
        WHERE  SeatMatrix_ID = :NEW.SeatMatrix_ID;
    END IF;
END TRG_ALLOTMENT_SEATS;
/

-- TRG3: After exam attempt booking — keep Shift_Total_Candidates current.
CREATE OR REPLACE TRIGGER TRG_SHIFT_HEADCOUNT
AFTER INSERT ON EXAM_ATTEMPT
FOR EACH ROW
BEGIN
    UPDATE SHIFT
    SET    Shift_Total_Candidates = Shift_Total_Candidates + 1
    WHERE  Shift_ID = :NEW.Shift_ID;
END TRG_SHIFT_HEADCOUNT;
/

-- TRG4: When a question is marked dropped or restored, automatically
--       bulk-update responses and re-evaluate if restored.
CREATE OR REPLACE TRIGGER TRG_QUESTION_DROPPED
AFTER UPDATE OF Is_Dropped, Correct_Ans ON QUESTION
FOR EACH ROW
BEGIN
    IF :NEW.Is_Dropped = 'Y' THEN
        UPDATE RESPONSE
        SET    Status = 'Dropped'
        WHERE  Question_ID = :NEW.Question_ID;
    ELSE
        -- If restored (Is_Dropped = 'N') or if Correct_Ans changed,
        -- re-evaluate the candidate answers against the new correct answer
        UPDATE RESPONSE
        SET    Status = CASE
                   WHEN Candidate_Answer = :NEW.Correct_Ans THEN 'Correct'
                   WHEN Candidate_Answer IS NULL OR Candidate_Answer = '' THEN 'Not Attempted'
                   ELSE 'Wrong'
               END
        WHERE  Question_ID = :NEW.Question_ID;
    END IF;
END TRG_QUESTION_DROPPED;
/

COMMIT;
PROMPT Procedures, triggers, and views created successfully.
