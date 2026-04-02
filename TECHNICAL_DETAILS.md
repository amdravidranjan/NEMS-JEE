# Technical Details & Features

While the front-end has a clean and simple look, the backend is powered by a robust Oracle database implementation designed to enforce data integrity and handle complex computational tasks.

## 1. Database Architecture
The system consists of **16 normalized relational tables** covering every functional domain of the examination process:
- **User Management**: `CANDIDATE`
- **Locations & Logistics**: `LOCATION`, `INSTITUTE`, `PROGRAM`, `SEAT_MATRIX`
- **Exam Operations**: `EXAM_SESSION`, `SHIFT`, `EXAM_CENTER`, `EXAM_ATTEMPT`, `QUESTION`, `RESPONSE`, `SCORE`, `RANK_TABLE`
- **Support & Allocations**: `SUPPORT_TICKET`, `ANSWER_CHALLENGE`, `ALLOTMENT`

## 2. Advanced PL/SQL Automation
Instead of relying solely on the Python server for manipulation, we embedded our heavy business logic natively inside the database.

### ⚡ Stored Procedures
- **`SP_CALC_PERCENTILES`**: Calculates the mathematical NTA-style decimal percentiles of students within a specific exam session.
- **`SP_GENERATE_RANKS`**: Dynamically generates the prestigious All India Ranks (AIR) and Category Ranks by evaluating the best percentiles across all sessions natively.
- **`SP_RESOLVE_CHALLENGE`**: Acts as a massive administrative operator. When an answer key challenge is "Accepted", it automatically re-evaluates all the recorded responses globally and prepares the scores for regeneration!

### 🎯 Autonomous Triggers
Our triggers prevent physical data corruption and eliminate dangerous race conditions:
- **`TRG_ALLOTMENT_VALIDATE`**: Validates rank bounds. It will strictly reject any `INSERT` or `UPDATE` to the `ALLOTMENT` table if the candidate's rank falls outside the Seat Matrix Opening/Closing rank bounds.
- **`TRG_ALLOTMENT_SEATS`**: Tracks live physical capacity. Deducts from `Available_Seats` during a successful booking, and adds seats back if a booking is cancelled.
- **`TRG_SHIFT_HEADCOUNT`**: Maintains a live counter of `Shift_Total_Candidates` immediately as candidates book attempts.
- **`TRG_QUESTION_DROPPED`**: Resolves globally dropped or restored questions seamlessly by updating impacted Candidate Responses instantly.

### 👁 Dynamic Views
We abstracted complex inner joins and subqueries into standard runtime views:
- **`V_CANDIDATE_SCORECARD`**: Pulls the single highest scoring attempt per candidate and dynamically maps it to their AIR and Profile.
- **`V_SEAT_AVAILABILITY`**: Displays true matrix capacities taking into consideration active allotments via Subqueries.
- **`V_ALLOTMENT_FULL`** & **`V_CENTER_LOAD`**: Aggregates comprehensive global metrics for the Admin Dashboard.

## 3. Technology Stack 
- **Database Engine**: Oracle 21c Express Edition (XE)
- **Backend API Server**: Python 3.10 with Flask
- **Data Driver Protocol**: `oracledb` Thin Client
- **Frontend SPA Framework**: Vanilla JS, HTML5, CSS3
