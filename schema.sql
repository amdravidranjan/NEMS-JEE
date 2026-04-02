-- ============================================================
-- JEE Allotment System -- Oracle 21c Schema
-- Run this in SQL*Plus: @schema.sql
-- ============================================================
DROP TABLE ANSWER_CHALLENGE CASCADE CONSTRAINTS;
DROP TABLE SUPPORT_TICKET CASCADE CONSTRAINTS;
DROP TABLE ALLOTMENT CASCADE CONSTRAINTS;
DROP TABLE SEAT_MATRIX CASCADE CONSTRAINTS;
DROP TABLE PROGRAM CASCADE CONSTRAINTS;
DROP TABLE INSTITUTE CASCADE CONSTRAINTS;
DROP TABLE RANK_TABLE CASCADE CONSTRAINTS;
DROP TABLE SCORE CASCADE CONSTRAINTS;
DROP TABLE RESPONSE CASCADE CONSTRAINTS;
DROP TABLE QUESTION CASCADE CONSTRAINTS;
DROP TABLE EXAM_ATTEMPT CASCADE CONSTRAINTS;
DROP TABLE EXAM_CENTER CASCADE CONSTRAINTS;
DROP TABLE SHIFT CASCADE CONSTRAINTS;
DROP TABLE EXAM_SESSION CASCADE CONSTRAINTS;
DROP TABLE CANDIDATE CASCADE CONSTRAINTS;
DROP TABLE LOCATION CASCADE CONSTRAINTS;


-- 1. LOCATION (R15)
CREATE TABLE LOCATION (
    Pincode       VARCHAR2(6)   PRIMARY KEY,
    City          VARCHAR2(50)  NOT NULL,
    State         VARCHAR2(50)  NOT NULL
);

-- 2. CANDIDATE (R14)
CREATE TABLE CANDIDATE (
    Application_No          VARCHAR2(12)  PRIMARY KEY,
    First_Name              VARCHAR2(50)  NOT NULL,
    Last_Name               VARCHAR2(50)  NOT NULL,
    DOB                     DATE          NOT NULL,
    Gender                  CHAR(1)       CHECK (Gender IN ('M','F','O')),
    Category                VARCHAR2(10)  CHECK (Category IN ('General','OBC','SC','ST','EWS')),
    PwD_Status              CHAR(1)       DEFAULT 'N' CHECK (PwD_Status IN ('Y','N')),
    Aadhaar_No              VARCHAR2(12)  UNIQUE,
    Email                   VARCHAR2(100) UNIQUE NOT NULL,
    Mobile_No               VARCHAR2(10)  NOT NULL,
    Class12_RollNo          VARCHAR2(20),
    Class12_Year            NUMBER(4),
    Class10_RollNo          VARCHAR2(20),
    Class10_Year            NUMBER(4),
    State_Code_Eligibility  VARCHAR2(2),
    Pincode                 VARCHAR2(6)   REFERENCES LOCATION(Pincode),
    Password_Hash           VARCHAR2(255) NOT NULL
);

-- 3. EXAM_SESSION (R11)
CREATE TABLE EXAM_SESSION (
    Session_ID    VARCHAR2(10)  PRIMARY KEY,
    Session_Name  VARCHAR2(100) NOT NULL
);

-- 4. SHIFT (R10)
CREATE TABLE SHIFT (
    Shift_ID               VARCHAR2(10)  PRIMARY KEY,
    Session_ID             VARCHAR2(10)  REFERENCES EXAM_SESSION(Session_ID),
    Shift_Date             DATE          NOT NULL,
    Shift_Timing           VARCHAR2(20)  NOT NULL,
    Paper_Type             VARCHAR2(20),
    Shift_Total_Candidates NUMBER        DEFAULT 0
);

-- 5. EXAM_CENTER (R18)
CREATE TABLE EXAM_CENTER (
    Center_ID       VARCHAR2(10)  PRIMARY KEY,
    Center_Name     VARCHAR2(150) NOT NULL,
    Center_PIN      VARCHAR2(6)   REFERENCES LOCATION(Pincode),
    Center_Capacity NUMBER        NOT NULL
);

-- 6. EXAM_ATTEMPT (R16)
CREATE TABLE EXAM_ATTEMPT (
    Attempt_ID        VARCHAR2(15) PRIMARY KEY,
    Session_ID        VARCHAR2(10) REFERENCES EXAM_SESSION(Session_ID),
    Application_No    VARCHAR2(12) REFERENCES CANDIDATE(Application_No),
    Shift_ID          VARCHAR2(10) REFERENCES SHIFT(Shift_ID),
    Center_ID         VARCHAR2(10) REFERENCES EXAM_CENTER(Center_ID),
    Attendance_Status CHAR(1)      DEFAULT 'N' CHECK (Attendance_Status IN ('Y','N'))
);

-- 7. QUESTION (R13)
CREATE TABLE QUESTION (
    Question_ID  VARCHAR2(10)  PRIMARY KEY,
    Subject      VARCHAR2(20)  CHECK (Subject IN ('Math','Physics','Chemistry')),
    Q_Type       VARCHAR2(30),
    Correct_Ans  VARCHAR2(5),
    Is_Dropped   CHAR(1)       DEFAULT 'N' CHECK (Is_Dropped IN ('Y','N'))
);

-- 8. RESPONSE (R12)
CREATE TABLE RESPONSE (
    Response_ID      VARCHAR2(15) PRIMARY KEY,
    Attempt_ID       VARCHAR2(15) REFERENCES EXAM_ATTEMPT(Attempt_ID),
    Question_ID      VARCHAR2(10) REFERENCES QUESTION(Question_ID),
    Candidate_Answer VARCHAR2(5),
    Status           VARCHAR2(20),
    CONSTRAINT uq_attempt_question UNIQUE (Attempt_ID, Question_ID)
);

-- 9. SCORE (R5)
CREATE TABLE SCORE (
    Attempt_ID        VARCHAR2(15),
    Math_Raw          NUMBER,
    Phy_Raw           NUMBER,
    Chem_Raw          NUMBER,
    Total_Raw         NUMBER,
    Math_Percentile   NUMBER(8,4),
    Phy_Percentile    NUMBER(8,4),
    Chem_Percentile   NUMBER(8,4),
    Total_Percentile  NUMBER(8,4),
    CONSTRAINT pk_score PRIMARY KEY (Attempt_ID),
    CONSTRAINT fk_score_attempt FOREIGN KEY (Attempt_ID) REFERENCES EXAM_ATTEMPT(Attempt_ID)
);

-- 10. RANK_TABLE (R6)
CREATE TABLE RANK_TABLE (
    Application_No  VARCHAR2(12),
    Best_Total_NTA  NUMBER(8,4),
    AIR             NUMBER,
    Category_Rank   NUMBER,
    CONSTRAINT pk_rank PRIMARY KEY (Application_No),
    CONSTRAINT fk_rank_candidate FOREIGN KEY (Application_No) REFERENCES CANDIDATE(Application_No)
);

-- 11. INSTITUTE (R21)
CREATE TABLE INSTITUTE (
    Institute_Code  VARCHAR2(10)  PRIMARY KEY,
    Institute_Name  VARCHAR2(200) NOT NULL,
    State_Code      VARCHAR2(2)   NOT NULL
);

-- 12. PROGRAM (R22)
CREATE TABLE PROGRAM (
    Program_Code  VARCHAR2(10)  PRIMARY KEY,
    Program_Name  VARCHAR2(200) NOT NULL
);

-- 13. SEAT_MATRIX (R20)
CREATE TABLE SEAT_MATRIX (
    SeatMatrix_ID   VARCHAR2(15)  PRIMARY KEY,
    Institute_Code  VARCHAR2(10)  REFERENCES INSTITUTE(Institute_Code),
    Program_Code    VARCHAR2(10)  REFERENCES PROGRAM(Program_Code),
    Quota           VARCHAR2(20),
    Seat_Type       VARCHAR2(20),
    Gender          VARCHAR2(15),
    Opening_Rank    NUMBER,
    Closing_Rank    NUMBER,
    Available_Seats NUMBER        DEFAULT 0
);

-- 14. ALLOTMENT (R0)
CREATE TABLE ALLOTMENT (
    Application_No  VARCHAR2(12),
    SeatMatrix_ID   VARCHAR2(15) REFERENCES SEAT_MATRIX(SeatMatrix_ID),
    Allotment_Date  DATE         DEFAULT SYSDATE,
    Round_No        NUMBER       DEFAULT 1,
    CONSTRAINT pk_allotment PRIMARY KEY (Application_No),
    CONSTRAINT fk_allot_candidate FOREIGN KEY (Application_No) REFERENCES CANDIDATE(Application_No)
);

-- 15. SUPPORT_TICKET (R8)
CREATE TABLE SUPPORT_TICKET (
    Ticket_ID      VARCHAR2(15)  PRIMARY KEY,
    Application_No VARCHAR2(12)  REFERENCES CANDIDATE(Application_No),
    Category       VARCHAR2(50),
    Description    VARCHAR2(500),
    Created_At     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    Status         VARCHAR2(20)  DEFAULT 'Open'
);

-- 16. ANSWER_CHALLENGE (R9)
CREATE TABLE ANSWER_CHALLENGE (
    Challenge_ID       VARCHAR2(15)  PRIMARY KEY,
    Application_No     VARCHAR2(12)  REFERENCES CANDIDATE(Application_No),
    Question_ID        VARCHAR2(10)  REFERENCES QUESTION(Question_ID),
    Claimed_Ans        VARCHAR2(5),
    Document_Path      VARCHAR2(200),
    Fee_Transaction_ID VARCHAR2(20),
    Challenge_Status   VARCHAR2(20)  DEFAULT 'Pending'
);

COMMIT;
PROMPT Schema created successfully.
