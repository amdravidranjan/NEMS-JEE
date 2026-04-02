# Application Features

The JEE Allotment System is designed to realistically simulate the entire lifecycle of a national entrance examination. The platform's capabilities are split across two core user bases:

## 🎓 The Candidate Experience

- **Seamless Registration & Authentication**
  - Securely hashed passwords and robust browser session management.
  - Profile generation with demographic constraints, automatically mapping to home-state quotas down the line.

- **Dynamic Exam Slot Booking**
  - Candidates can view available regional testing centers.
  - Seamless selection of examination sessions and shifts.
  - Under-the-hood algorithmic validations preventing double-booking and instantly depleting physical seating quotas.

- **Live Examination Portal**
  - Fully functioning in-browser testing environment.
  - Dedicated countdown timers simulating high-stakes pressure.
  - Organized, cleanly-tabbed interfaces segregating questions into Physics, Chemistry, and Mathematics panes.
  - Real-time serialization and commitment of answers directly to the relational database.

- **Automated Scorecards & Rankings**
  - Provides real-time raw scores instantly leveraging NTA rules (+4 for correct, -1 for incorrect, and +4 edge-case overrides for globally dropped questions).
  - Accurate calculation of decimal percentiles mapped against localized shift performance curves.
  - Algorithmic evaluation of global All India Ranks (AIR) dynamically pulling the highest recorded percentiles across all attempts.

- **Seat Matrix & College Allotment**
  - Interactive "Seat Matrix" engine allowing candidates to browse active university capacities. Filtering support across: Institute Name, Degree Program, Quota (Home State vs. Other State), and Reserved Category bounding.
  - Algorithmic Seat Allotment engine securely allocating seats, strictly gated by historical Opening and Closing Ranks to prevent unauthorized distributions.

- **End-user Support System**
  - Standardized customer support ticketing mechanism enabling users to flag issues.
  - Capability for students to formally challenge Official Answer Keys—if accepted by an admin, the system automatically runs a cascading recalculation event.

---

## ⚙️ The Administrator Dashboard

- **Master Database Control**
  - Complete internal CRUD (Create, Read, Update, Delete) capabilities over operational entities.
  - Effortless internal control panel for managing active Institutes, adding new Programs, and allocating total capacities in the global Seat Matrix.

- **Global Execution Authority**
  - Secure administrative tools to manually trigger sweeping procedural tasks—such as Rank Generation—to finalize cycles.
  
- **Question & Answer Management**
  - Ability to mark poorly written or mathematically unresolvable questions as "Dropped" systematically, seamlessly altering evaluation logic.
  - Processing Answer Key Challenges directly initiates massive automated re-grading scripts affecting all related responses instantly.

- **System Health & Demographics**
  - Macro-level views aggregating shift capacities, actual filled allocations, footprint metrics, and pending ticket assignments.
