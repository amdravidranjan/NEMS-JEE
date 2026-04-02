/* ===================================================================
   JEE Allotment System — Single-Page Application
   =================================================================== */

// ── State ─────────────────────────────────────────────────────────
const State = {
  user: null,          // { role, name, app_no }
  examState: null,     // active exam session data
};

// ── API helper ────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  return res.json();
}

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Router ────────────────────────────────────────────────────────
const routes = {
  '#landing': renderLanding,
  '#login': renderLogin,
  '#register': renderRegister,
  '#dashboard': renderDashboard,
  '#exam-booking': renderExamBooking,
  '#exam-portal': renderExamPortal,
  '#scorecard': renderScorecard,
  '#seat-matrix': renderSeatMatrix,
  '#allotment': renderAllotment,
  '#support': renderSupport,
  '#admin': renderAdmin,
};

function navigate(hash) {
  window.location.hash = hash;
}

async function handleRoute() {
  const hash = window.location.hash || '#landing';

  // Auth-gated routes
  const publicRoutes = ['#landing', '#login', '#register'];
  if (!publicRoutes.includes(hash) && !State.user) {
    const res = await api('GET', '/me');
    if (res.status === 'ok') {
      State.user = res.data;
    } else {
      navigate('#landing');
      return;
    }
  }

  const fn = routes[hash];
  if (!fn) { navigate('#landing'); return; }

  // Show/hide shell vs auth pages
  const isAuth = publicRoutes.includes(hash);
  document.getElementById('shell').style.display = isAuth ? 'none' : 'flex';
  document.getElementById('page-landing').style.display = hash === '#landing' ? 'block' : 'none';
  document.getElementById('page-login').style.display = hash === '#login' ? 'block' : 'none';
  document.getElementById('page-register').style.display = hash === '#register' ? 'block' : 'none';

  if (!isAuth) {
    updateSidebar();
    document.getElementById('app').innerHTML = '<div class="loading">Loading</div>';
  }

  fn();
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);

// ── Sidebar ───────────────────────────────────────────────────────
function updateSidebar() {
  if (!State.user) return;
  document.getElementById('sb-name').textContent = State.user.name;
  document.getElementById('sb-role').textContent = State.user.role.toUpperCase();

  const isAdmin = State.user.role === 'admin';
  const nav = document.getElementById('nav-links');
  nav.innerHTML = '';

  const candidateLinks = [
    { icon: '◈', label: 'Dashboard', hash: '#dashboard' },
    { icon: '◉', label: 'Exam Booking', hash: '#exam-booking' },
    { icon: '✎', label: 'Exam Portal', hash: '#exam-portal' },
    { icon: '◎', label: 'Scorecard', hash: '#scorecard' },
    { icon: '⊞', label: 'Seat Matrix', hash: '#seat-matrix' },
    { icon: '✦', label: 'My Allotment', hash: '#allotment' },
    { icon: '◈', label: 'Support', hash: '#support' },
  ];

  const adminLinks = [
    { icon: '◈', label: 'Overview', hash: '#admin', tab: 'overview' },
    { icon: '⊞', label: 'Candidates', hash: '#admin', tab: 'candidates' },
    { icon: '◉', label: 'Sessions', hash: '#admin', tab: 'sessions' },
    { icon: '✎', label: 'Questions', hash: '#admin', tab: 'questions' },
    { icon: '◎', label: 'Institutes', hash: '#admin', tab: 'institutes' },
    { icon: '⊟', label: 'Seat Matrix', hash: '#admin', tab: 'seatmatrix' },
    { icon: '✦', label: 'Allotments', hash: '#admin', tab: 'allotments' },
    { icon: '◈', label: 'Tickets', hash: '#admin', tab: 'tickets' },
    { icon: '◉', label: 'Challenges', hash: '#admin', tab: 'challenges' },
  ];

  const links = isAdmin ? adminLinks : candidateLinks;
  const sectionLabel = document.createElement('div');
  sectionLabel.className = 'nav-section';
  sectionLabel.textContent = isAdmin ? 'Admin Panel' : 'Candidate';
  nav.appendChild(sectionLabel);

  const currentHash = window.location.hash;
  links.forEach(link => {
    const a = document.createElement('a');
    a.href = link.hash;
    a.className = currentHash === link.hash ? 'active' : '';
    a.innerHTML = `<span class="icon">${link.icon}</span>${link.label}`;
    if (link.tab) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = link.hash;
        setTimeout(() => switchAdminTab(link.tab), 50);
      });
    }
    nav.appendChild(a);
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await api('POST', '/logout');
    State.user = null;
    navigate('#landing');
  });
}

function setPageTitle(title, breadcrumb = '') {
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('topbar-breadcrumb').textContent = breadcrumb || 'JEE Allotment System';
  // Update active nav link
  document.querySelectorAll('#nav-links a').forEach(a => {
    a.className = a.getAttribute('href') === window.location.hash ? 'active' : '';
  });
}

// ── ════════════════════════════════════════════════════════════ ──
//    LANDING
// ── ════════════════════════════════════════════════════════════ ──
function renderLanding() {
  document.getElementById('page-landing').innerHTML = `
    <div style="min-height:100vh; display:flex; flex-direction:column;">
      <div style="padding:20px 40px; border-bottom:2px solid #1a1a1a; display:flex; align-items:center; justify-content:space-between; background:var(--cream);">
        <div style="font-family:var(--mono); font-weight:800; font-size:1rem; letter-spacing:-0.5px;">
          JEE ALLOTMENT SYSTEM
        </div>
        <div style="display:flex; gap:12px;">
          <a href="#login" class="btn btn-outline btn-sm">Login</a>
          <a href="#register" class="btn btn-primary btn-sm">Register</a>
        </div>
      </div>

      <div class="landing-hero">
        <div class="hero-text">
          <div class="label">✦ National Testing Agency · JoSAA ✦</div>
          <h1>Your Path to a <span>Premier</span> Institute Starts Here</h1>
          <p>Complete your JEE registration, appear for the exam, check your rank, browse seat matrix, and secure your college seat — all in one place.</p>
          <div style="display:flex; gap:16px; flex-wrap:wrap;">
            <a href="#register" class="btn btn-primary btn-lg">Register as Candidate</a>
            <a href="#login" class="btn btn-dark btn-lg">Existing Candidate Login</a>
          </div>
          <p style="margin-top:16px; font-size:0.75rem; color:#888; font-family:var(--mono);">
            Admin login: username <strong>admin</strong> / password <strong>admin123</strong>
          </p>
        </div>

        <div class="hero-art">
          <div class="hero-art-inner">
            <div class="big-number">JEE</div>
            <div style="font-size:3rem; font-weight:800; letter-spacing:-2px; color:var(--black); font-family:var(--mono); line-height:1;">2024</div>
            <p>Main & Advanced</p>
            <div style="display:flex; gap:8px; justify-content:center; margin-top:16px; flex-wrap:wrap;">
              <span class="badge badge-amber">1.4M Candidates</span>
              <span class="badge badge-green">23 IITs</span>
              <span class="badge badge-blue">31 NITs</span>
            </div>
          </div>
        </div>
      </div>

      <div class="landing-steps">
        <div class="step">
          <span class="step-num">01</span>
          <h3>Register & Apply</h3>
          <p>Fill your personal details, academic history, and choose your eligibility state.</p>
        </div>
        <div class="step">
          <span class="step-num">02</span>
          <h3>Appear for Exam</h3>
          <p>Book your exam slot, appear at the allotted center, and submit your responses.</p>
        </div>
        <div class="step">
          <span class="step-num">03</span>
          <h3>Check Rank</h3>
          <p>View your NTA score, percentile, All India Rank and category rank.</p>
        </div>
        <div class="step">
          <span class="step-num">04</span>
          <h3>Get Allotted</h3>
          <p>Browse the seat matrix and receive your college allotment through JoSAA counseling.</p>
        </div>
      </div>
    </div>
  `;
}

// ── ════════════════════════════════════════════════════════════ ──
//    LOGIN
// ── ════════════════════════════════════════════════════════════ ──
function renderLogin() {
  document.getElementById('page-login').innerHTML = `
    <div class="auth-page">
      <div class="auth-box">
        <div class="auth-header">
          <h2>Sign In</h2>
          <p>Enter your application number and password, or log in as admin.</p>
        </div>

        <div class="form-group" style="margin-bottom:24px;">
          <label>Login As</label>
          <div style="display:flex; gap:0;">
            <button class="btn btn-primary" style="flex:1; justify-content:center;" id="role-candidate">Candidate</button>
            <button class="btn btn-outline" style="flex:1; justify-content:center;" id="role-admin">Admin</button>
          </div>
        </div>

        <div id="login-fields-candidate">
          <div class="form-group">
            <label>Application Number</label>
            <input type="text" id="login-appno" placeholder="e.g. 240110001">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-pass" placeholder="••••••••">
            <div class="form-hint">Demo password: pass123</div>
          </div>
        </div>

        <div id="login-fields-admin" style="display:none;">
          <div class="form-group">
            <label>Admin Username</label>
            <input type="text" id="admin-user" placeholder="admin">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="admin-pass" placeholder="admin123">
          </div>
        </div>

        <button class="btn btn-primary btn-full btn-lg" id="btn-login" style="margin-top:8px;">Sign In</button>

        <p style="text-align:center; margin-top:16px; font-size:0.85rem; color:#666;">
          New candidate? <a href="#register" style="color:var(--black); font-weight:700;">Register here</a>
        </p>
        <p style="text-align:center; margin-top:8px;">
          <a href="#landing" style="color:#888; font-size:0.8rem;">← Back to home</a>
        </p>
      </div>
    </div>
  `;

  let loginRole = 'candidate';

  document.getElementById('role-candidate').addEventListener('click', () => {
    loginRole = 'candidate';
    document.getElementById('role-candidate').className = 'btn btn-primary';
    document.getElementById('role-admin').className = 'btn btn-outline';
    document.getElementById('login-fields-candidate').style.display = '';
    document.getElementById('login-fields-admin').style.display = 'none';
  });

  document.getElementById('role-admin').addEventListener('click', () => {
    loginRole = 'admin';
    document.getElementById('role-admin').className = 'btn btn-primary';
    document.getElementById('role-candidate').className = 'btn btn-outline';
    document.getElementById('login-fields-admin').style.display = '';
    document.getElementById('login-fields-candidate').style.display = 'none';
  });

  document.getElementById('btn-login').addEventListener('click', async () => {
    let payload;
    if (loginRole === 'admin') {
      payload = { role: 'admin', username: document.getElementById('admin-user').value, password: document.getElementById('admin-pass').value };
    } else {
      payload = { role: 'candidate', application_no: document.getElementById('login-appno').value, password: document.getElementById('login-pass').value };
    }
    const res = await api('POST', '/login', payload);
    if (res.status === 'ok') {
      State.user = res.data;
      toast(`Welcome, ${res.data.name}!`, 'success');
      navigate(loginRole === 'admin' ? '#admin' : '#dashboard');
    } else {
      toast(res.msg, 'error');
    }
  });
}

// ── ════════════════════════════════════════════════════════════ ──
//    REGISTER
// ── ════════════════════════════════════════════════════════════ ──
function renderRegister() {
  document.getElementById('page-register').innerHTML = `
    <div style="min-height:100vh; background:var(--cream); padding:40px; display:flex; justify-content:center; align-items:flex-start;">
      <div style="width:100%; max-width:720px; background:var(--white); border:var(--border); box-shadow:var(--shadow-lg); padding:40px;">
        <div style="margin-bottom:28px;">
          <a href="#landing" style="color:#888; font-size:0.8rem; font-family:var(--mono); text-decoration:none;">← Back to home</a>
          <h2 style="margin-top:12px;">Candidate Registration</h2>
          <p style="color:#666; font-size:0.85rem; margin-top:4px;">Fill all fields carefully. Your Application Number will be your login ID.</p>
        </div>

        <div class="section-label">Personal Information</div>
        <div class="form-row" style="margin-bottom:0;">
          <div class="form-group"><label>Application Number *</label><input id="r-appno" placeholder="e.g. 240110009"></div>
          <div class="form-group"><label>Aadhaar Number *</label><input id="r-aadhaar" placeholder="12-digit Aadhaar"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>First Name *</label><input id="r-fname" placeholder="Arjun"></div>
          <div class="form-group"><label>Last Name *</label><input id="r-lname" placeholder="Sharma"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Date of Birth *</label><input id="r-dob" type="date"></div>
          <div class="form-group"><label>Gender *</label>
            <select id="r-gender"><option value="">-- Select --</option><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Category *</label>
            <select id="r-category"><option value="">-- Select --</option><option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>EWS</option></select>
          </div>
          <div class="form-group"><label>PwD Status</label>
            <select id="r-pwd"><option value="N">No</option><option value="Y">Yes</option></select>
          </div>
        </div>

        <div class="section-label" style="margin-top:24px;">Contact Details</div>
        <div class="form-row">
          <div class="form-group"><label>Email *</label><input id="r-email" type="email" placeholder="arjun@email.com"></div>
          <div class="form-group"><label>Mobile Number *</label><input id="r-mobile" placeholder="10-digit mobile"></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>Pincode *</label><input id="r-pin" placeholder="600001"></div>
          <div class="form-group"><label>City *</label><input id="r-city" placeholder="Chennai"></div>
          <div class="form-group"><label>State *</label><input id="r-state" placeholder="Tamil Nadu"></div>
        </div>
        <div class="form-group"><label>State Code of Eligibility</label><input id="r-sce" placeholder="TN"></div>

        <div class="section-label" style="margin-top:24px;">Academic History</div>
        <div class="form-row">
          <div class="form-group"><label>Class 12 Roll No</label><input id="r-12roll" placeholder="TN2024001"></div>
          <div class="form-group"><label>Class 12 Year</label><input id="r-12yr" type="number" placeholder="2024"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Class 10 Roll No</label><input id="r-10roll" placeholder="TN2022001"></div>
          <div class="form-group"><label>Class 10 Year</label><input id="r-10yr" type="number" placeholder="2022"></div>
        </div>

        <div class="section-label" style="margin-top:24px;">Set Password</div>
        <div class="form-row">
          <div class="form-group"><label>Password *</label><input id="r-pass" type="password" placeholder="••••••••"></div>
          <div class="form-group"><label>Confirm Password *</label><input id="r-pass2" type="password" placeholder="••••••••"></div>
        </div>

        <button class="btn btn-primary btn-full btn-lg" id="btn-register" style="margin-top:16px;">Complete Registration</button>

        <p style="text-align:center; margin-top:16px; font-size:0.85rem; color:#666;">
          Already registered? <a href="#login" style="color:var(--black); font-weight:700;">Sign in</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById('btn-register').addEventListener('click', async () => {
    if (document.getElementById('r-pass').value !== document.getElementById('r-pass2').value) {
      toast('Passwords do not match.', 'error'); return;
    }
    const payload = {
      application_no: document.getElementById('r-appno').value,
      first_name: document.getElementById('r-fname').value,
      last_name: document.getElementById('r-lname').value,
      dob: document.getElementById('r-dob').value,
      gender: document.getElementById('r-gender').value,
      category: document.getElementById('r-category').value,
      pwd_status: document.getElementById('r-pwd').value,
      aadhaar_no: document.getElementById('r-aadhaar').value,
      email: document.getElementById('r-email').value,
      mobile_no: document.getElementById('r-mobile').value,
      class12_rollno: document.getElementById('r-12roll').value,
      class12_year: document.getElementById('r-12yr').value,
      class10_rollno: document.getElementById('r-10roll').value,
      class10_year: document.getElementById('r-10yr').value,
      state_code: document.getElementById('r-sce').value,
      pincode: document.getElementById('r-pin').value,
      city: document.getElementById('r-city').value,
      state: document.getElementById('r-state').value,
      password: document.getElementById('r-pass').value,
    };
    const res = await api('POST', '/register', payload);
    if (res.status === 'ok') {
      toast('Registration successful! Please log in.', 'success');
      setTimeout(() => navigate('#login'), 1200);
    } else {
      toast(res.msg, 'error');
    }
  });
}

// ── ════════════════════════════════════════════════════════════ ──
//    DASHBOARD
// ── ════════════════════════════════════════════════════════════ ──
async function renderDashboard() {
  setPageTitle('Dashboard', 'Overview');
  const app_no = State.user.app_no;

  const [candRes, attRes, rankRes, allotRes] = await Promise.all([
    api('GET', `/candidate/${app_no}`),
    api('GET', `/attempts/${app_no}`),
    api('GET', `/rank/${app_no}`),
    api('GET', `/allotment/${app_no}`),
  ]);

  const c = candRes.data || {};
  const attempts = attRes.data || [];
  const rank = rankRes.data;
  const allotment = allotRes.data;

  const hasAttempt = attempts.length > 0;
  const hasAppeared = attempts.some(a => a.attendance_status === 'Y');
  const hasRank = !!rank;
  const hasAllotment = !!allotment;

  const steps = [
    { label: 'Registered', done: true, active: false },
    { label: 'Exam Booked', done: hasAttempt, active: !hasAttempt },
    { label: 'Appeared', done: hasAppeared, active: hasAttempt && !hasAppeared },
    { label: 'Ranked', done: hasRank, active: hasAppeared && !hasRank },
    { label: 'Allotted', done: hasAllotment, active: hasRank && !hasAllotment },
  ];

  const initials = `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`;

  document.getElementById('app').innerHTML = `
    <div class="page-header">
      <h1>Welcome back, ${c.first_name || State.user.name}</h1>
      <p>Here's your JEE application overview.</p>
    </div>

    <!-- Status Timeline -->
    <div class="card" style="margin-bottom:24px;">
      <h4 style="margin-bottom:16px;">Application Status</h4>
      <div class="status-timeline">
        ${steps.map(s => `
          <div class="timeline-step ${s.done ? 'done' : ''} ${s.active ? 'active' : ''}">
            <div class="timeline-dot">${s.done ? '✓' : s.active ? '→' : '○'}</div>
            <div class="timeline-label">${s.label}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Profile Card -->
    <div class="card" style="margin-bottom:24px;">
      <h4 style="margin-bottom:20px;">Candidate Profile</h4>
      <div class="profile-card">
        <div class="profile-avatar">${initials}</div>
        <div class="profile-info">
          <div class="name">${c.first_name || ''} ${c.last_name || ''}</div>
          <div class="app-no">App No: ${c.application_no || app_no}</div>
          <div class="profile-details">
            <div class="detail-item"><label>Category</label><span>${c.category || '—'}</span></div>
            <div class="detail-item"><label>Gender</label><span>${c.gender === 'M' ? 'Male' : c.gender === 'F' ? 'Female' : c.gender || '—'}</span></div>
            <div class="detail-item"><label>PwD</label><span>${c.pwd_status === 'Y' ? 'Yes' : 'No'}</span></div>
            <div class="detail-item"><label>Email</label><span>${c.email || '—'}</span></div>
            <div class="detail-item"><label>Mobile</label><span>${c.mobile_no || '—'}</span></div>
            <div class="detail-item"><label>City</label><span>${c.city || '—'}, ${c.state || ''}</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid-4" style="margin-bottom:24px;">
      <div class="card card-accent card-sm">
        <div class="card-title">Attempts</div>
        <div class="card-value">${attempts.length}</div>
      </div>
      <div class="card card-green card-sm">
        <div class="card-title">AIR</div>
        <div class="card-value">${rank ? rank.air?.toLocaleString() : '—'}</div>
      </div>
      <div class="card card-blue card-sm">
        <div class="card-title">Best Percentile</div>
        <div class="card-value">${rank ? parseFloat(rank.best_total_nta).toFixed(2) : '—'}</div>
      </div>
      <div class="card ${hasAllotment ? 'card-green' : 'card-red'} card-sm">
        <div class="card-title">Allotment</div>
        <div class="card-value" style="font-size:1rem;">${hasAllotment ? allotment.institute_name?.split(' ').slice(0, 2).join(' ') : 'Pending'}</div>
      </div>
    </div>

    <!-- Attempts Table -->
    ${attempts.length > 0 ? `
    <div class="card">
      <h4 style="margin-bottom:16px;">Exam Attempts</h4>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Attempt ID</th><th>Session</th><th>Date</th><th>Timing</th><th>Center</th><th>Attendance</th><th>Action</th></tr></thead>
          <tbody>
            ${attempts.map(a => `
              <tr>
                <td><code>${a.attempt_id}</code></td>
                <td>${a.session_name}</td>
                <td>${a.shift_date}</td>
                <td>${a.shift_timing}</td>
                <td>${a.center_name}</td>
                <td><span class="badge ${a.attendance_status === 'Y' ? 'badge-green' : 'badge-gray'}">${a.attendance_status === 'Y' ? 'Present' : 'Absent'}</span></td>
                <td><a href="#scorecard" class="btn btn-sm btn-outline" onclick="State._scoreAttempt='${a.attempt_id}'">View Score</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : `
    <div class="card">
      <div class="empty">
        <div class="empty-icon">◎</div>
        <h3>No Exam Booked Yet</h3>
        <p>Book your exam slot to begin your JEE journey.</p>
        <a href="#exam-booking" class="btn btn-primary" style="margin-top:16px;">Book Exam Slot</a>
      </div>
    </div>
    `}
  `;
}

// ── ════════════════════════════════════════════════════════════ ──
//    EXAM BOOKING
// ── ════════════════════════════════════════════════════════════ ──
async function renderExamBooking() {
  setPageTitle('Exam Booking', 'Book Your Slot');

  const [sessRes, shiftsRes, centersRes] = await Promise.all([
    api('GET', '/sessions'),
    api('GET', '/shifts'),
    api('GET', '/centers'),
  ]);

  const sessions = sessRes.data || [];
  const shifts = shiftsRes.data || [];
  const centers = centersRes.data || [];

  document.getElementById('app').innerHTML = `
    <div class="page-header">
      <h1>Book Your Exam Slot</h1>
      <p>Select your preferred session, shift, and exam centre.</p>
    </div>

    <div class="grid-2" style="align-items:start;">
      <div>
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:20px;">Slot Selection</h3>

          <div class="form-group">
            <label>Exam Session *</label>
            <select id="book-session">
              <option value="">-- Choose Session --</option>
              ${sessions.map(s => `<option value="${s.session_id}">${s.session_name}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Shift *</label>
            <select id="book-shift">
              <option value="">-- Choose Shift --</option>
              ${shifts.map(s => `<option value="${s.shift_id}" data-session="${s.session_id}">${s.shift_date} | ${s.shift_timing} | ${s.paper_type}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Exam Centre *</label>
            <select id="book-center">
              <option value="">-- Choose Centre --</option>
              ${centers.map(c => `<option value="${c.center_id}">${c.center_name} — ${c.city}, ${c.state} (Cap: ${c.center_capacity})</option>`).join('')}
            </select>
          </div>

          <button class="btn btn-primary btn-full" id="btn-book">Confirm Booking</button>
        </div>
      </div>

      <div>
        <div class="card dot-bg">
          <h4 style="margin-bottom:16px;">Available Sessions</h4>
          ${sessions.map(s => `
            <div style="background:var(--white); border:var(--border); padding:16px; margin-bottom:12px; box-shadow:var(--shadow);">
              <div style="font-weight:800; font-size:0.9rem;">${s.session_name}</div>
              <div style="font-family:var(--mono); font-size:0.7rem; color:#888; margin-top:4px;">ID: ${s.session_id}</div>
              <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:6px;">
                ${shifts.filter(sh => sh.session_id === s.session_id).map(sh => `
                  <span class="badge badge-amber">${sh.shift_date} ${sh.shift_timing}</span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('book-session').addEventListener('change', function () {
    const sid = this.value;
    document.querySelectorAll('#book-shift option').forEach(opt => {
      if (!opt.value) return;
      opt.style.display = (opt.dataset.session === sid || !sid) ? '' : 'none';
    });
    document.getElementById('book-shift').value = '';
  });

  document.getElementById('btn-book').addEventListener('click', async () => {
    const payload = {
      session_id: document.getElementById('book-session').value,
      shift_id: document.getElementById('book-shift').value,
      center_id: document.getElementById('book-center').value,
    };
    if (!payload.session_id || !payload.shift_id || !payload.center_id) {
      toast('Please fill all fields.', 'error'); return;
    }
    const res = await api('POST', '/attempts', payload);
    if (res.status === 'ok') {
      toast(res.msg, 'success');
      setTimeout(() => navigate('#dashboard'), 1200);
    } else {
      toast(res.msg, 'error');
    }
  });
}

// ── ════════════════════════════════════════════════════════════ ──
//    EXAM PORTAL
// ── ════════════════════════════════════════════════════════════ ──
async function renderExamPortal() {
  setPageTitle('Exam Portal', 'Online Examination');

  const app_no = State.user.app_no;
  const attRes = await api('GET', `/attempts/${app_no}`);
  const attempts = (attRes.data || []).filter(a => a.attendance_status === 'N');

  if (attempts.length === 0) {
    document.getElementById('app').innerHTML = `
      <div class="page-header"><h1>Exam Portal</h1></div>
      <div class="card"><div class="empty">
        <div class="empty-icon">✎</div>
        <h3>No Pending Exams</h3>
        <p>You have no upcoming exams to appear for, or you have already submitted all exams.</p>
        <a href="#scorecard" class="btn btn-outline" style="margin-top:16px;">View Scorecards</a>
      </div></div>`;
    return;
  }

  // Show attempt selector first
  if (!State.examState) {
    document.getElementById('app').innerHTML = `
      <div class="page-header">
        <h1>Exam Portal</h1>
        <p>Select the exam you want to appear for.</p>
      </div>
      <div style="max-width:500px;">
        ${attempts.map(a => `
          <div class="card" style="margin-bottom:16px;">
            <h3>${a.session_name}</h3>
            <div style="color:#666; font-size:0.85rem; margin:8px 0;">${a.shift_date} | ${a.shift_timing}</div>
            <div style="font-size:0.8rem; margin-bottom:16px; color:#888;">Centre: ${a.center_name}</div>
            <button class="btn btn-primary" data-attempt="${a.attempt_id}">Start Exam →</button>
          </div>
        `).join('')}
      </div>`;

    document.querySelectorAll('[data-attempt]').forEach(btn => {
      btn.addEventListener('click', () => startExam(btn.dataset.attempt));
    });
    return;
  }

  renderExamUI();
}

async function startExam(attemptId) {
  const qRes = await api('GET', '/questions');
  const questions = qRes.data || [];

  // Simulate 9 questions (as per seed data — in production this would be 90)
  State.examState = {
    attempt_id: attemptId,
    questions: questions,
    answers: {},
    current: 0,
    startTime: Date.now(),
    duration: 3 * 60 * 60 * 1000, // 3 hours
  };
  renderExamUI();
}

function renderExamUI() {
  const { questions, answers, current } = State.examState;
  if (!questions.length) return;

  const q = questions[current];
  const timeLeft = Math.max(0, State.examState.duration - (Date.now() - State.examState.startTime));
  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  const timerStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const opts = ['A', 'B', 'C', 'D'];
  const optTexts = [
    'Option A — First possible answer', 'Option B — Second possible answer',
    'Option C — Third possible answer', 'Option D — Fourth possible answer'
  ];

  document.getElementById('app').innerHTML = `
    <div class="exam-header">
      <div>
        <div style="font-size:0.7rem; font-family:var(--mono); color:#888; margin-bottom:4px;">ATTEMPT: ${State.examState.attempt_id}</div>
        <div style="font-weight:700;">JEE Main — Online Examination</div>
      </div>
      <div class="exam-timer" id="exam-timer">${timerStr}</div>
      <button class="btn btn-danger" id="btn-submit-exam">Submit Exam</button>
    </div>

    <!-- Subject tabs -->
    <div class="tabs" style="margin-bottom:16px;">
      ${['Math', 'Physics', 'Chemistry'].map(subj => `
        <button class="tab-btn ${q.subject === subj ? 'active' : ''}" data-subject="${subj}">${subj}</button>
      `).join('')}
    </div>

    <!-- Question navigator -->
    <div class="card" style="margin-bottom:20px; padding:16px;">
      <div style="font-family:var(--mono); font-size:0.7rem; color:#888; margin-bottom:10px;">QUESTION NAVIGATOR</div>
      <div class="question-nav">
        ${questions.map((qq, i) => `
          <button class="q-nav-btn ${i === current ? 'current' : answers[qq.question_id] ? 'answered' : 'not-attempted'}"
                  data-idx="${i}">${i + 1}</button>
        `).join('')}
      </div>
      <div style="display:flex; gap:12px; margin-top:12px; font-size:0.7rem; font-family:var(--mono);">
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--amber);border:1px solid #1a1a1a;display:inline-block;"></span> Answered</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--black);border:1px solid #1a1a1a;display:inline-block;"></span> Current</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:var(--cream);border:1px solid #ccc;display:inline-block;"></span> Not Attempted</span>
      </div>
    </div>

    <!-- Question -->
    <div class="question-card">
      <div class="q-number">Question ${current + 1} of ${questions.length} · ${q.subject} · ${q.q_type}</div>
      <div class="q-text">
        ${q.q_type === 'Integer'
      ? `Find the integer value for question ${q.question_id.replace('Q', '#')} in ${q.subject}.`
      : `Which of the following is correct for question ${q.question_id.replace('Q', '#')} in ${q.subject}?`
    }
      </div>

      ${q.q_type === 'Integer' ? `
        <div class="form-group" style="max-width:200px;">
          <label>Your Answer (Integer)</label>
          <input type="number" id="int-answer" value="${answers[q.question_id] || ''}" placeholder="Enter integer">
        </div>
      ` : `
        <div class="options">
          ${opts.map((opt, i) => `
            <div class="option ${answers[q.question_id] === opt ? 'selected' : ''}" data-opt="${opt}">
              <div class="opt-label">${opt}</div>
              <div class="opt-text">${optTexts[i]}</div>
            </div>
          `).join('')}
        </div>
      `}

      <div style="display:flex; gap:12px; margin-top:24px; justify-content:space-between;">
        <div style="display:flex; gap:10px;">
          <button class="btn btn-outline btn-sm" id="btn-clear">Clear Response</button>
          <button class="btn btn-outline btn-sm" id="btn-prev" ${current === 0 ? 'disabled' : ''}>← Prev</button>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary btn-sm" id="btn-save-next">Save & Next →</button>
        </div>
      </div>
    </div>
  `;

  // Timer
  const timerInterval = setInterval(() => {
    const tl = Math.max(0, State.examState.duration - (Date.now() - State.examState.startTime));
    const hh = Math.floor(tl / 3600000);
    const mm = Math.floor((tl % 3600000) / 60000);
    const ss = Math.floor((tl % 60000) / 1000);
    const el = document.getElementById('exam-timer');
    if (el) el.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    if (tl === 0) { clearInterval(timerInterval); submitExam(); }
  }, 1000);

  // Events
  document.querySelectorAll('.tab-btn[data-subject]').forEach(btn => {
    btn.addEventListener('click', () => {
      const subj = btn.dataset.subject;
      const firstIdx = questions.findIndex(qq => qq.subject === subj);
      if (firstIdx !== -1) {
        saveCurrentAnswer(q);
        State.examState.current = firstIdx;
        clearInterval(timerInterval);
        renderExamUI();
      }
    });
  });

  document.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      State.examState.answers[q.question_id] = opt.dataset.opt;
      renderExamUI();
    });
  });

  document.querySelectorAll('.q-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      saveCurrentAnswer(q);
      State.examState.current = parseInt(btn.dataset.idx);
      clearInterval(timerInterval);
      renderExamUI();
    });
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    delete State.examState.answers[q.question_id];
    renderExamUI();
  });

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (current > 0) {
      saveCurrentAnswer(q);
      State.examState.current--;
      clearInterval(timerInterval);
      renderExamUI();
    }
  });

  document.getElementById('btn-save-next').addEventListener('click', () => {
    saveCurrentAnswer(q);
    if (current < questions.length - 1) {
      State.examState.current++;
      clearInterval(timerInterval);
      renderExamUI();
    } else {
      clearInterval(timerInterval);
      submitExam();
    }
  });

  document.getElementById('btn-submit-exam').addEventListener('click', () => {
    clearInterval(timerInterval);
    submitExam();
  });
}

function saveCurrentAnswer(q) {
  if (q.q_type === 'Integer') {
    const val = document.getElementById('int-answer')?.value;
    if (val) State.examState.answers[q.question_id] = val;
  }
}

async function submitExam() {
  const { attempt_id, questions, answers } = State.examState;
  const responses = questions.map(q => ({
    question_id: q.question_id,
    candidate_answer: answers[q.question_id] || '',
  }));

  const res = await api('POST', '/responses', { attempt_id, responses });
  State.examState = null;
  if (res.status === 'ok') {
    toast('Exam submitted! Score calculated.', 'success');
    setTimeout(() => navigate('#scorecard'), 1200);
  } else {
    toast(res.msg || 'Submission failed.', 'error');
    navigate('#dashboard');
  }
}

// ── ════════════════════════════════════════════════════════════ ──
//    SCORECARD
// ── ════════════════════════════════════════════════════════════ ──
async function renderScorecard() {
  setPageTitle('Scorecard', 'Scores & Rank');
  const app_no = State.user.app_no;

  const [scoresRes, rankRes] = await Promise.all([
    api('GET', `/scores/${app_no}`),
    api('GET', `/rank/${app_no}`),
  ]);

  const scores = scoresRes.data || [];
  const rank = rankRes.data;

  if (scores.length === 0) {
    document.getElementById('app').innerHTML = `
      <div class="page-header"><h1>Scorecard</h1></div>
      <div class="card"><div class="empty">
        <div class="empty-icon">◎</div>
        <h3>No Scores Yet</h3>
        <p>Appear for an exam to see your scores here.</p>
      </div></div>`;
    return;
  }

  const activeIdx = State._scoreAttempt
    ? scores.findIndex(s => s.attempt_id === State._scoreAttempt)
    : 0;
  const sc = scores[Math.max(0, activeIdx)];

  const maxRaw = 120 * 4; // 120 questions × 4 marks each subject

  document.getElementById('app').innerHTML = `
    <div class="page-header"><h1>Scorecard</h1><p>Your NTA scores and percentiles.</p></div>

    <!-- Attempt selector -->
    ${scores.length > 1 ? `
    <div class="tabs" style="margin-bottom:24px;">
      ${scores.map((s, i) => `<button class="tab-btn ${i === Math.max(0, activeIdx) ? 'active' : ''}" data-idx="${i}">${s.session_name} — ${s.shift_date}</button>`).join('')}
    </div>` : ''}

    <div class="grid-2" style="align-items:start;">
      <!-- Score Details -->
      <div class="card">
        <h3 style="margin-bottom:20px;">${sc.session_name || ''} — ${sc.shift_date || ''}</h3>

        <div style="text-align:center; margin-bottom:24px;">
          <div class="score-ring" style="width:140px; height:140px;">
            <div class="score-val">${sc.total_raw || 0}</div>
            <div class="score-label">Total Raw</div>
          </div>
        </div>

        <div class="section-label">Subject-wise Scores</div>

        <div class="subject-score-bar">
          <div class="subject-name">Math</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, (sc.math_raw || 0) + 30) / (maxRaw + 30) * 100}%"></div></div>
          <div class="raw-val">${sc.math_raw ?? '—'}</div>
        </div>
        <div class="subject-score-bar">
          <div class="subject-name">Physics</div>
          <div class="bar-track"><div class="bar-fill physics" style="width:${Math.max(0, (sc.phy_raw || 0) + 30) / (maxRaw + 30) * 100}%"></div></div>
          <div class="raw-val">${sc.phy_raw ?? '—'}</div>
        </div>
        <div class="subject-score-bar">
          <div class="subject-name">Chemistry</div>
          <div class="bar-track"><div class="bar-fill chemistry" style="width:${Math.max(0, (sc.chem_raw || 0) + 30) / (maxRaw + 30) * 100}%"></div></div>
          <div class="raw-val">${sc.chem_raw ?? '—'}</div>
        </div>
      </div>

      <!-- Percentiles & Rank -->
      <div>
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">NTA Percentile Scores</h3>
          <div class="grid-2" style="gap:12px;">
            ${[['Math', sc.math_percentile], ['Physics', sc.phy_percentile], ['Chemistry', sc.chem_percentile], ['Overall', sc.total_percentile]].map(([subj, pct]) => `
              <div style="background:var(--cream); border:var(--border); padding:14px;">
                <div style="font-family:var(--mono); font-size:0.65rem; color:#888; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">${subj}</div>
                <div style="font-size:1.4rem; font-weight:800; font-family:var(--mono);">${pct ? parseFloat(pct).toFixed(4) : '—'}</div>
              </div>
            `).join('')}
          </div>
        </div>

        ${rank ? `
        <div class="card">
          <h3 style="margin-bottom:16px;">Your Rank</h3>
          <div class="rank-display">
            <div class="rank-box">
              <div class="rank-label">All India Rank</div>
              <div class="rank-num">${rank.air?.toLocaleString() || '—'}</div>
            </div>
            <div class="rank-box" style="background:var(--amber); color:var(--black);">
              <div class="rank-label" style="color:var(--black);">Category Rank</div>
              <div class="rank-num" style="color:var(--black);">${rank.category_rank?.toLocaleString() || '—'}</div>
            </div>
          </div>
          <div style="margin-top:16px; text-align:center;">
            <div style="font-family:var(--mono); font-size:0.7rem; color:#888; margin-bottom:4px;">BEST TOTAL PERCENTILE</div>
            <div style="font-size:1.8rem; font-weight:800;">${parseFloat(rank.best_total_nta).toFixed(4)}</div>
          </div>
        </div>` : `
        <div class="card">
          <div class="empty" style="padding:32px;">
            <h3>Ranks Not Published</h3>
            <p>Ranks are published after result processing.</p>
          </div>
        </div>`}
      </div>
    </div>

    <!-- Response Analysis -->
    <div class="card" style="margin-top:24px;">
      <h3 style="margin-bottom:16px;">Response Analysis</h3>
      <button class="btn btn-outline btn-sm" id="btn-load-responses">Load Detailed Analysis</button>
      <div id="responses-table" style="margin-top:16px;"></div>
    </div>
  `;

  if (scores.length > 1) {
    document.querySelectorAll('.tab-btn[data-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        State._scoreAttempt = scores[idx].attempt_id;
        renderScorecard();
      });
    });
  }

  document.getElementById('btn-load-responses')?.addEventListener('click', async () => {
    const rRes = await api('GET', `/responses/${sc.attempt_id}`);
    const rows = rRes.data || [];
    document.getElementById('responses-table').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Q ID</th><th>Subject</th><th>Type</th><th>Your Answer</th><th>Correct Answer</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td><code>${r.question_id}</code></td>
                <td>${r.subject}</td>
                <td>${r.q_type}</td>
                <td>${r.candidate_answer || '—'}</td>
                <td><strong>${r.correct_ans}</strong></td>
                <td><span class="badge ${r.status === 'Correct' ? 'badge-green' : r.status === 'Wrong' ? 'badge-red' : 'badge-gray'}">${r.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  });
}

// ── ════════════════════════════════════════════════════════════ ──
//    SEAT MATRIX
// ── ════════════════════════════════════════════════════════════ ──
async function renderSeatMatrix() {
  setPageTitle('Seat Matrix', 'Browse Available Seats');

  const [instRes, progRes] = await Promise.all([
    api('GET', '/institutes'),
    api('GET', '/programs'),
  ]);
  const institutes = instRes.data || [];
  const programs = progRes.data || [];

  document.getElementById('app').innerHTML = `
    <div class="page-header">
      <h1>Seat Matrix</h1>
      <p>Browse opening and closing ranks across institutes and programs.</p>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label>Institute</label>
        <select id="f-inst">
          <option value="">All Institutes</option>
          ${institutes.map(i => `<option value="${i.institute_code}">${i.institute_name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Program</label>
        <select id="f-prog">
          <option value="">All Programs</option>
          ${programs.map(p => `<option value="${p.program_code}">${p.program_name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Quota</label>
        <select id="f-quota">
          <option value="">All Quotas</option>
          <option>AI</option><option>HS</option><option>OS</option>
        </select>
      </div>
      <div class="form-group">
        <label>Seat Type</label>
        <select id="f-seattype">
          <option value="">All Types</option>
          <option>OPEN</option><option>OBC-NCL</option><option>SC</option><option>ST</option><option>EWS</option>
        </select>
      </div>
      <div class="form-group" style="align-self:flex-end;">
        <button class="btn btn-primary" id="btn-filter-sm">Apply Filters</button>
      </div>
    </div>

    <div id="sm-results" class="grid-auto">
      <div class="loading">Loading seat matrix</div>
    </div>
  `;

  async function loadSeatMatrix() {
    const params = new URLSearchParams();
    const inst = document.getElementById('f-inst').value;
    const prog = document.getElementById('f-prog').value;
    const quota = document.getElementById('f-quota').value;
    const st = document.getElementById('f-seattype').value;
    if (inst) params.append('institute', inst);
    if (prog) params.append('program', prog);
    if (quota) params.append('quota', quota);
    if (st) params.append('seat_type', st);

    const res = await api('GET', `/seat-matrix?${params}`);
    const rows = res.data || [];

    document.getElementById('sm-results').innerHTML = rows.length === 0 ? `
      <div class="empty" style="grid-column:1/-1;">
        <div class="empty-icon">⊞</div>
        <h3>No Results</h3>
        <p>Try different filter criteria.</p>
      </div>` : rows.map(sm => `
      <div class="sm-card">
        <div class="inst-name">${sm.institute_name}</div>
        <div class="prog-name">${sm.program_name}</div>
        <div class="sm-meta">
          <span class="badge badge-amber">${sm.quota}</span>
          <span class="badge badge-blue">${sm.seat_type}</span>
          <span class="badge badge-gray">${sm.gender}</span>
        </div>
        <div style="font-size:0.75rem; color:#666; margin-bottom:8px;">Available Seats: <strong>${sm.available_seats}</strong></div>
        <div class="sm-ranks">
          <span>Opening: <strong>${sm.opening_rank?.toLocaleString()}</strong></span>
          <span>Closing: <strong>${sm.closing_rank?.toLocaleString()}</strong></span>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('btn-filter-sm').addEventListener('click', loadSeatMatrix);
  loadSeatMatrix();
}

// ── ════════════════════════════════════════════════════════════ ──
//    ALLOTMENT
// ── ════════════════════════════════════════════════════════════ ──
async function renderAllotment() {
  setPageTitle('My Allotment', 'College Allotment Result');
  const app_no = State.user.app_no;

  const [allotRes, rankRes] = await Promise.all([
    api('GET', `/allotment/${app_no}`),
    api('GET', `/rank/${app_no}`),
  ]);

  const allotment = allotRes.data;
  const rank = rankRes.data;

  if (!allotment) {
    document.getElementById('app').innerHTML = `
      <div class="page-header"><h1>College Allotment</h1></div>
      <div class="allotment-result">
        <div class="trophy">⏳</div>
        <h2>Allotment Pending</h2>
        <p>The JoSAA allotment has not been published yet, or you have not been allotted in this round.</p>
        ${rank ? `
        <div style="margin-top:24px; display:inline-block;">
          <div class="alert alert-info">Your AIR is <strong>${rank.air?.toLocaleString()}</strong>. Check the seat matrix to see which programmes you may be eligible for.</div>
        </div>` : ''}
        <div style="margin-top:24px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="#seat-matrix" class="btn btn-primary">Browse Seat Matrix</a>
          <a href="#scorecard" class="btn btn-outline">View Rank Card</a>
        </div>
      </div>`;
    return;
  }

  document.getElementById('app').innerHTML = `
    <div class="page-header"><h1>College Allotment</h1><p>JoSAA Round ${allotment.round_no || 1} Allotment Result</p></div>

    <div class="allotment-result">
      <div class="trophy">🎓</div>
      <h2>Congratulations!</h2>
      <p>You have been allotted a seat in Round ${allotment.round_no || 1}.</p>

      <div style="max-width:600px; margin:0 auto;">
        <div style="background:var(--amber); border:var(--border); box-shadow:var(--shadow-lg); padding:28px; margin-bottom:24px;">
          <div style="font-size:1.4rem; font-weight:800; margin-bottom:4px;">${allotment.institute_name}</div>
          <div style="font-size:1.1rem; font-weight:600; margin-bottom:12px; color:var(--black);">${allotment.program_name}</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <span class="badge" style="background:var(--white);">${allotment.quota}</span>
            <span class="badge" style="background:var(--white);">${allotment.seat_type}</span>
          </div>
        </div>

        <div class="allotment-detail-grid">
          <div class="allotment-detail-item">
            <div class="label">Allotment Date</div>
            <div class="value">${allotment.allotment_date || '—'}</div>
          </div>
          <div class="allotment-detail-item">
            <div class="label">Round</div>
            <div class="value">${allotment.round_no || 1}</div>
          </div>
          <div class="allotment-detail-item">
            <div class="label">Opening Rank</div>
            <div class="value">${allotment.opening_rank?.toLocaleString() || '—'}</div>
          </div>
          <div class="allotment-detail-item">
            <div class="label">Closing Rank (Your Year)</div>
            <div class="value">${allotment.closing_rank?.toLocaleString() || '—'}</div>
          </div>
          ${rank ? `
          <div class="allotment-detail-item">
            <div class="label">Your AIR</div>
            <div class="value">${rank.air?.toLocaleString()}</div>
          </div>
          <div class="allotment-detail-item">
            <div class="label">Category Rank</div>
            <div class="value">${rank.category_rank?.toLocaleString() || '—'}</div>
          </div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ── ════════════════════════════════════════════════════════════ ──
//    SUPPORT
// ── ════════════════════════════════════════════════════════════ ──
async function renderSupport() {
  setPageTitle('Support', 'Tickets & Challenges');
  const app_no = State.user.app_no;

  document.getElementById('app').innerHTML = `
    <div class="page-header"><h1>Support Centre</h1><p>Raise grievances and challenge answer keys.</p></div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="tickets">My Tickets</button>
      <button class="tab-btn" data-tab="challenges">Answer Key Challenges</button>
    </div>
    <div class="tab-pane active" id="tab-tickets"></div>
    <div class="tab-pane" id="tab-challenges"></div>
  `;

  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Tickets
  const [tkRes, qRes] = await Promise.all([
    api('GET', `/tickets/${app_no}`),
    api('GET', '/questions'),
  ]);
  const tickets = tkRes.data || [];
  const questions = qRes.data || [];

  document.getElementById('tab-tickets').innerHTML = `
    <div class="grid-2" style="align-items:start; margin-top:20px;">
      <div class="card">
        <h3 style="margin-bottom:20px;">Raise a Ticket</h3>
        <div class="form-group">
          <label>Category</label>
          <select id="tk-cat">
            <option>Application Issue</option>
            <option>Score Discrepancy</option>
            <option>Center Allotment</option>
            <option>Admit Card</option>
            <option>Result Query</option>
            <option>JoSAA Counseling</option>
            <option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="tk-desc" placeholder="Describe your issue in detail..."></textarea>
        </div>
        <button class="btn btn-primary btn-full" id="btn-raise-ticket">Submit Ticket</button>
      </div>

      <div>
        <h3 style="margin-bottom:16px;">My Tickets</h3>
        ${tickets.length === 0 ? `<div class="empty"><div class="empty-icon">◈</div><p>No tickets raised yet.</p></div>` : ''}
        ${tickets.map(t => `
          <div class="card" style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <code style="font-size:0.75rem;">${t.ticket_id}</code>
              <span class="badge ${t.status === 'Open' ? 'badge-amber' : t.status === 'Resolved' ? 'badge-green' : 'badge-gray'}">${t.status}</span>
            </div>
            <div style="font-weight:700; font-size:0.85rem; margin-bottom:4px;">${t.category}</div>
            <div style="font-size:0.8rem; color:#666;">${t.description}</div>
            <div style="font-family:var(--mono); font-size:0.65rem; color:#aaa; margin-top:8px;">${t.created_at}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Challenges
  const chRes = await api('GET', `/challenges/${app_no}`);
  const challenges = chRes.data || [];

  document.getElementById('tab-challenges').innerHTML = `
    <div class="grid-2" style="align-items:start; margin-top:20px;">
      <div class="card">
        <h3 style="margin-bottom:20px;">Challenge an Answer Key</h3>
        <div class="alert alert-info" style="margin-bottom:16px;">Fee of ₹200 per challenge. Fee is refunded if challenge is accepted.</div>
        <div class="form-group">
          <label>Question</label>
          <select id="ch-qid">
            <option value="">-- Select Question --</option>
            ${questions.map(q => `<option value="${q.question_id}">${q.question_id} — ${q.subject} (${q.q_type})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Your Claimed Answer</label>
          <input id="ch-ans" placeholder="e.g. A or 72">
        </div>
        <div class="form-group">
          <label>Fee Transaction ID</label>
          <input id="ch-fee" placeholder="e.g. TXN2024099">
        </div>
        <div class="form-group">
          <label>Document Path (supporting evidence)</label>
          <input id="ch-doc" placeholder="uploads/evidence.pdf">
        </div>
        <button class="btn btn-primary btn-full" id="btn-challenge">Submit Challenge</button>
      </div>

      <div>
        <h3 style="margin-bottom:16px;">My Challenges</h3>
        ${challenges.length === 0 ? `<div class="empty"><div class="empty-icon">◉</div><p>No challenges submitted yet.</p></div>` : ''}
        ${challenges.map(ch => `
          <div class="card" style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <code>${ch.challenge_id}</code>
              <span class="badge ${ch.challenge_status === 'Accepted' ? 'badge-green' : ch.challenge_status === 'Rejected' ? 'badge-red' : 'badge-amber'}">${ch.challenge_status}</span>
            </div>
            <div style="font-size:0.85rem;"><strong>${ch.question_id}</strong> — ${ch.subject}</div>
            <div style="font-size:0.8rem; color:#666; margin-top:4px;">Your Claimed Answer: <strong>${ch.claimed_ans}</strong> | NTA Answer: <strong>${ch.correct_ans}</strong></div>
            <div style="font-family:var(--mono); font-size:0.65rem; color:#aaa; margin-top:6px;">Fee TX: ${ch.fee_transaction_id}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.getElementById('btn-raise-ticket').addEventListener('click', async () => {
    const res = await api('POST', '/tickets', {
      category: document.getElementById('tk-cat').value,
      description: document.getElementById('tk-desc').value,
    });
    if (res.status === 'ok') {
      toast(res.msg, 'success');
      renderSupport();
    } else {
      toast(res.msg, 'error');
    }
  });

  document.getElementById('btn-challenge').addEventListener('click', async () => {
    const res = await api('POST', '/challenges', {
      question_id: document.getElementById('ch-qid').value,
      claimed_ans: document.getElementById('ch-ans').value,
      fee_transaction_id: document.getElementById('ch-fee').value,
      document_path: document.getElementById('ch-doc').value,
    });
    if (res.status === 'ok') {
      toast(res.msg, 'success');
      renderSupport();
    } else {
      toast(res.msg, 'error');
    }
  });
}

// ── ════════════════════════════════════════════════════════════ ──
//    ADMIN PANEL
// ── ════════════════════════════════════════════════════════════ ──
let _adminTab = 'overview';

function switchAdminTab(tab) {
  _adminTab = tab;
  document.querySelectorAll('.admin-tab-btn').forEach(b => {
    b.className = 'admin-tab-btn tab-btn' + (b.dataset.tab === tab ? ' active' : '');
  });
  document.querySelectorAll('.admin-pane').forEach(p => {
    p.className = 'admin-pane tab-pane' + (p.id === 'admin-' + tab ? ' active' : '');
  });
  loadAdminTab(tab);
}

async function renderAdmin() {
  setPageTitle('Admin Panel', 'System Administration');
  if (State.user?.role !== 'admin') { navigate('#login'); return; }

  const tabs = ['overview', 'candidates', 'sessions', 'questions', 'institutes', 'seatmatrix', 'allotments', 'tickets', 'challenges'];

  document.getElementById('app').innerHTML = `
    <div class="page-header"><h1>Admin Panel</h1><p>Manage all aspects of the JEE Allotment System.</p></div>

    <div class="tabs" style="flex-wrap:wrap;">
      ${tabs.map(t => `<button class="admin-tab-btn tab-btn ${t === _adminTab ? 'active' : ''}" data-tab="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('')}
    </div>

    ${tabs.map(t => `<div class="admin-pane tab-pane ${t === _adminTab ? 'active' : ''}" id="admin-${t}"><div class="loading">Loading</div></div>`).join('')}
  `;

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchAdminTab(btn.dataset.tab));
  });

  loadAdminTab(_adminTab);
}

async function loadAdminTab(tab) {
  const el = document.getElementById('admin-' + tab);
  if (!el) return;

  switch (tab) {
    case 'overview': await adminOverview(el); break;
    case 'candidates': await adminCandidates(el); break;
    case 'sessions': await adminSessions(el); break;
    case 'questions': await adminQuestions(el); break;
    case 'institutes': await adminInstitutes(el); break;
    case 'seatmatrix': await adminSeatMatrix(el); break;
    case 'allotments': await adminAllotments(el); break;
    case 'tickets': await adminTickets(el); break;
    case 'challenges': await adminChallenges(el); break;
  }
}

async function adminOverview(el) {
  const res = await api('GET', '/stats');
  const s = res.data || {};
  el.innerHTML = `
    <div style="margin-top:20px;">
      <div class="grid-4" style="margin-bottom:24px;">
        <div class="card card-accent"><div class="card-title">Total Candidates</div><div class="card-value">${s.total_candidates || 0}</div></div>
        <div class="card card-blue"><div class="card-title">Exam Attempts</div><div class="card-value">${s.total_attempts || 0}</div></div>
        <div class="card card-green"><div class="card-title">Ranked</div><div class="card-value">${s.ranked_candidates || 0}</div></div>
        <div class="card card-green"><div class="card-title">Allotments</div><div class="card-value">${s.allotments || 0}</div></div>
        <div class="card card-red"><div class="card-title">Open Tickets</div><div class="card-value">${s.open_tickets || 0}</div></div>
        <div class="card card-accent"><div class="card-title">Pending Challenges</div><div class="card-value">${s.pending_challenges || 0}</div></div>
      </div>

      <div class="card dot-bg" style="margin-bottom:20px;">
        <h3 style="margin-bottom:16px;">Quick Actions</h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-gen-ranks">Generate All India Ranks</button>
          <button class="btn btn-dark" onclick="switchAdminTab('allotments')">Manage Allotments</button>
          <button class="btn btn-outline" onclick="switchAdminTab('tickets')">Review Tickets</button>
          <button class="btn btn-outline" onclick="switchAdminTab('challenges')">Review Challenges</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-gen-ranks').addEventListener('click', async () => {
    const res = await api('POST', '/ranks/generate');
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminOverview(el);
  });
}

async function adminCandidates(el) {
  const res = await api('GET', '/candidates');
  const rows = res.data || [];
  el.innerHTML = `
    <div style="margin-top:20px;">
      <div class="table-wrap">
        <table>
          <thead><tr><th>App No</th><th>Name</th><th>Email</th><th>Category</th><th>Gender</th><th>Mobile</th><th>Pincode</th><th>Actions</th></tr></thead>
          <tbody>
            ${rows.map(c => `
              <tr>
                <td><code>${c.application_no}</code></td>
                <td>${c.first_name} ${c.last_name}</td>
                <td>${c.email}</td>
                <td><span class="badge badge-amber">${c.category}</span></td>
                <td>${c.gender === 'M' ? 'Male' : c.gender === 'F' ? 'Female' : c.gender}</td>
                <td>${c.mobile_no}</td>
                <td>${c.pincode}</td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="viewCandidateDetail('${c.application_no}')">View</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function viewCandidateDetail(appNo) {
  const res = await api('GET', `/candidate/${appNo}`);
  const c = res.data || {};
  const [rankRes, allotRes] = await Promise.all([
    api('GET', `/rank/${appNo}`),
    api('GET', `/allotment/${appNo}`),
  ]);
  const rank = rankRes.data;
  const allotment = allotRes.data;

  // Open a modal-like overlay
  let overlay = document.getElementById('admin-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'admin-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div style="background:var(--white);border:var(--border);box-shadow:var(--shadow-lg);padding:32px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2>${c.first_name} ${c.last_name}</h2>
        <button class="btn btn-outline btn-sm" id="close-overlay">✕ Close</button>
      </div>
      <div class="grid-2" style="gap:12px;">
        ${Object.entries({
    'Application No': c.application_no,
    'Email': c.email,
    'Mobile': c.mobile_no,
    'DOB': c.dob ? String(c.dob).substring(0, 10) : '—',
    'Gender': c.gender,
    'Category': c.category,
    'PwD': c.pwd_status,
    'City': c.city,
    'State': c.state,
    'AIR': rank?.air?.toLocaleString() || '—',
    'Category Rank': rank?.category_rank?.toLocaleString() || '—',
    'Allotment': allotment ? allotment.institute_name : 'None',
  }).map(([k, v]) => `
          <div style="background:var(--cream);border:var(--border);padding:10px;">
            <div style="font-family:var(--mono);font-size:0.65rem;color:#888;text-transform:uppercase;letter-spacing:1px;">${k}</div>
            <div style="font-weight:700;font-size:0.9rem;">${v || '—'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById('close-overlay').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function adminSessions(el) {
  const [sessRes, shiftsRes, centersRes] = await Promise.all([
    api('GET', '/sessions'),
    api('GET', '/shifts'),
    api('GET', '/centers'),
  ]);
  const sessions = sessRes.data || [];
  const shifts = shiftsRes.data || [];
  const centers = centersRes.data || [];

  el.innerHTML = `
    <div style="margin-top:20px;">
      <div class="grid-2" style="align-items:start; gap:20px;">

        <!-- Sessions -->
        <div>
          <div class="card" style="margin-bottom:20px;">
            <h3 style="margin-bottom:16px;">Add Session</h3>
            <div class="form-group"><label>Session ID</label><input id="new-sess-id" placeholder="SES2024C"></div>
            <div class="form-group"><label>Session Name</label><input id="new-sess-name" placeholder="JEE Main 2024 Session 3"></div>
            <button class="btn btn-primary btn-full" id="btn-add-sess">Add Session</button>
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>ID</th><th>Name</th><th>Action</th></tr></thead>
            <tbody>${sessions.map(s => `<tr><td><code>${s.session_id}</code></td><td>${s.session_name}</td><td><button class="btn btn-sm btn-outline btn-calc-pct" data-sid="${s.session_id}">Calc Percentiles</button></td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>

        <!-- Shifts -->
        <div>
          <div class="card" style="margin-bottom:20px;">
            <h3 style="margin-bottom:16px;">Add Shift</h3>
            <div class="form-group"><label>Shift ID</label><input id="new-sh-id" placeholder="SH06"></div>
            <div class="form-group"><label>Session</label>
              <select id="new-sh-sess">${sessions.map(s => `<option value="${s.session_id}">${s.session_name}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label>Date</label><input type="date" id="new-sh-date"></div>
            <div class="form-group"><label>Timing</label><input id="new-sh-timing" placeholder="09:00-12:00"></div>
            <div class="form-group"><label>Paper Type</label><input id="new-sh-paper" placeholder="Paper 1 (B.E/B.Tech)"></div>
            <button class="btn btn-primary btn-full" id="btn-add-shift">Add Shift</button>
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>ID</th><th>Session</th><th>Date</th><th>Timing</th><th>Headcount</th></tr></thead>
            <tbody>${shifts.map(s => `<tr><td><code>${s.shift_id}</code></td><td>${s.session_name}</td><td>${s.shift_date}</td><td>${s.shift_timing}</td><td><span class="badge badge-blue">${s.shift_total_candidates || 0}</span></td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Centers -->
      <div class="card" style="margin-top:20px;">
        <h3 style="margin-bottom:16px;">Add Exam Centre</h3>
        <div class="form-row-3">
          <div class="form-group"><label>Centre ID</label><input id="new-ctr-id" placeholder="CTR008"></div>
          <div class="form-group"><label>Centre Name</label><input id="new-ctr-name" placeholder="NTA Centre - ..."></div>
          <div class="form-group"><label>Capacity</label><input type="number" id="new-ctr-cap" placeholder="300"></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>Pincode</label><input id="new-ctr-pin" placeholder="600001"></div>
          <div class="form-group"><label>City</label><input id="new-ctr-city" placeholder="Chennai"></div>
          <div class="form-group"><label>State</label><input id="new-ctr-state" placeholder="Tamil Nadu"></div>
        </div>
        <button class="btn btn-primary" id="btn-add-ctr">Add Centre</button>
      </div>

      <div class="table-wrap" style="margin-top:20px;">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>City</th><th>State</th><th>Capacity</th></tr></thead>
          <tbody>${centers.map(c => `<tr><td><code>${c.center_id}</code></td><td>${c.center_name}</td><td>${c.city}</td><td>${c.state}</td><td>${c.center_capacity}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-sess').addEventListener('click', async () => {
    const res = await api('POST', '/sessions', { session_id: document.getElementById('new-sess-id').value, session_name: document.getElementById('new-sess-name').value });
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminSessions(el);
  });

  document.querySelectorAll('.btn-calc-pct').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sid = btn.dataset.sid;
      const res = await api('POST', '/admin/calc-percentiles', { session_id: sid });
      toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    });
  });

  document.getElementById('btn-add-shift').addEventListener('click', async () => {
    const res = await api('POST', '/shifts', {
      shift_id: document.getElementById('new-sh-id').value,
      session_id: document.getElementById('new-sh-sess').value,
      shift_date: document.getElementById('new-sh-date').value,
      shift_timing: document.getElementById('new-sh-timing').value,
      paper_type: document.getElementById('new-sh-paper').value,
    });
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminSessions(el);
  });

  document.getElementById('btn-add-ctr').addEventListener('click', async () => {
    const res = await api('POST', '/centers', {
      center_id: document.getElementById('new-ctr-id').value,
      center_name: document.getElementById('new-ctr-name').value,
      center_pin: document.getElementById('new-ctr-pin').value,
      city: document.getElementById('new-ctr-city').value,
      state: document.getElementById('new-ctr-state').value,
      capacity: document.getElementById('new-ctr-cap').value,
    });
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminSessions(el);
  });
}

async function adminQuestions(el) {
  const res = await api('GET', '/questions');
  const questions = res.data || [];

  el.innerHTML = `
    <div style="margin-top:20px;">
      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:16px;">Add Question</h3>
        <div class="form-row">
          <div class="form-group"><label>Question ID</label><input id="new-q-id" placeholder="Q010"></div>
          <div class="form-group"><label>Subject</label>
            <select id="new-q-subj"><option>Math</option><option>Physics</option><option>Chemistry</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Type</label>
            <select id="new-q-type"><option>MCQ Single</option><option>MCQ Multiple</option><option>Integer</option></select>
          </div>
          <div class="form-group"><label>Correct Answer</label><input id="new-q-ans" placeholder="A or 42"></div>
        </div>
        <button class="btn btn-primary" id="btn-add-q">Add Question</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Subject</th><th>Type</th><th>Correct Answer</th><th>Dropped</th><th>Action</th></tr></thead>
          <tbody>
            ${questions.map(q => `
              <tr>
                <td><code>${q.question_id}</code></td>
                <td><span class="badge ${q.subject === 'Math' ? 'badge-amber' : q.subject === 'Physics' ? 'badge-blue' : 'badge-green'}">${q.subject}</span></td>
                <td>${q.q_type}</td>
                <td><strong>${q.correct_ans}</strong></td>
                <td><span class="badge ${q.is_dropped === 'Y' ? 'badge-red' : 'badge-gray'}">${q.is_dropped === 'Y' ? 'Yes' : 'No'}</span></td>
                <td>
                  <button class="btn btn-sm btn-danger" data-qid="${q.question_id}" data-dropped="${q.is_dropped}" data-ans="${q.correct_ans}">
                    ${q.is_dropped === 'Y' ? 'Restore' : 'Drop'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-q').addEventListener('click', async () => {
    const res = await api('POST', '/questions', {
      question_id: document.getElementById('new-q-id').value,
      subject: document.getElementById('new-q-subj').value,
      q_type: document.getElementById('new-q-type').value,
      correct_ans: document.getElementById('new-q-ans').value,
    });
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminQuestions(el);
  });

  el.querySelectorAll('[data-qid]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const isDropped = btn.dataset.dropped === 'Y';
      const res = await api('PUT', `/questions/${btn.dataset.qid}`, {
        correct_ans: btn.dataset.ans,
        is_dropped: isDropped ? 'N' : 'Y',
      });
      toast(res.msg, res.status === 'ok' ? 'success' : 'error');
      if (res.status === 'ok') adminQuestions(el);
    });
  });
}

async function adminInstitutes(el) {
  const [instRes, progRes] = await Promise.all([
    api('GET', '/institutes'),
    api('GET', '/programs'),
  ]);
  const institutes = instRes.data || [];
  const programs = progRes.data || [];

  el.innerHTML = `
    <div style="margin-top:20px;" class="grid-2">
      <div>
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">Add Institute</h3>
          <div class="form-group"><label>Institute Code</label><input id="new-inst-code" placeholder="IIT-XYZ"></div>
          <div class="form-group"><label>Institute Name</label><input id="new-inst-name" placeholder="IIT ..."></div>
          <button class="btn btn-primary btn-full" id="btn-add-inst">Add Institute</button>
        </div>
        <div class="table-wrap">
          <table><thead><tr><th>Code</th><th>Name</th></tr></thead>
          <tbody>${institutes.map(i => `<tr><td><code>${i.institute_code}</code></td><td>${i.institute_name}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">Add Program</h3>
          <div class="form-group"><label>Program Code</label><input id="new-prog-code" placeholder="IT"></div>
          <div class="form-group"><label>Program Name</label><input id="new-prog-name" placeholder="Information Technology"></div>
          <button class="btn btn-primary btn-full" id="btn-add-prog">Add Program</button>
        </div>
        <div class="table-wrap">
          <table><thead><tr><th>Code</th><th>Name</th></tr></thead>
          <tbody>${programs.map(p => `<tr><td><code>${p.program_code}</code></td><td>${p.program_name}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-inst').addEventListener('click', async () => {
    const res = await api('POST', '/institutes', { institute_code: document.getElementById('new-inst-code').value, institute_name: document.getElementById('new-inst-name').value });
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminInstitutes(el);
  });

  document.getElementById('btn-add-prog').addEventListener('click', async () => {
    const res = await api('POST', '/programs', { program_code: document.getElementById('new-prog-code').value, program_name: document.getElementById('new-prog-name').value });
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminInstitutes(el);
  });
}

async function adminSeatMatrix(el) {
  const [smRes, instRes, progRes] = await Promise.all([
    api('GET', '/seat-matrix'),
    api('GET', '/institutes'),
    api('GET', '/programs'),
  ]);
  const seatMatrix = smRes.data || [];
  const institutes = instRes.data || [];
  const programs = progRes.data || [];

  el.innerHTML = `
    <div style="margin-top:20px;">
      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:16px;">Add Seat Matrix Entry</h3>
        <div class="form-row">
          <div class="form-group"><label>Seat Matrix ID</label><input id="sm-id" placeholder="SM016"></div>
          <div class="form-group"><label>Institute</label>
            <select id="sm-inst">${institutes.map(i => `<option value="${i.institute_code}">${i.institute_name}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Program</label>
            <select id="sm-prog">${programs.map(p => `<option value="${p.program_code}">${p.program_name}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Quota</label>
            <select id="sm-quota"><option>AI</option><option>HS</option><option>OS</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Seat Type</label>
            <select id="sm-type"><option>OPEN</option><option>OBC-NCL</option><option>SC</option><option>ST</option><option>EWS</option></select>
          </div>
          <div class="form-group"><label>Gender</label>
            <select id="sm-gender"><option>Gender-Neutral</option><option>Female-only</option></select>
          </div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label>Opening Rank</label><input type="number" id="sm-open" placeholder="1"></div>
          <div class="form-group"><label>Closing Rank</label><input type="number" id="sm-close" placeholder="100"></div>
          <div class="form-group"><label>Available Seats</label><input type="number" id="sm-seats" placeholder="30"></div>
        </div>
        <button class="btn btn-primary" id="btn-add-sm">Add Entry</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Institute</th><th>Program</th><th>Quota</th><th>Type</th><th>Opening</th><th>Closing</th><th>Seats</th><th>Action</th></tr></thead>
          <tbody>
            ${seatMatrix.map(sm => `
              <tr>
                <td><code>${sm.seatmatrix_id}</code></td>
                <td>${sm.institute_name}</td>
                <td>${sm.program_name}</td>
                <td><span class="badge badge-amber">${sm.quota}</span></td>
                <td><span class="badge badge-blue">${sm.seat_type}</span></td>
                <td>${sm.opening_rank?.toLocaleString()}</td>
                <td>${sm.closing_rank?.toLocaleString()}</td>
                <td>${sm.available_seats}</td>
                <td><button class="btn btn-sm btn-outline" data-smid="${sm.seatmatrix_id}">Edit</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-add-sm').addEventListener('click', async () => {
    const res = await api('POST', '/seat-matrix', {
      seatmatrix_id: document.getElementById('sm-id').value,
      institute_code: document.getElementById('sm-inst').value,
      program_code: document.getElementById('sm-prog').value,
      quota: document.getElementById('sm-quota').value,
      seat_type: document.getElementById('sm-type').value,
      gender: document.getElementById('sm-gender').value,
      opening_rank: document.getElementById('sm-open').value,
      closing_rank: document.getElementById('sm-close').value,
      available_seats: document.getElementById('sm-seats').value,
    });
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminSeatMatrix(el);
  });
}

async function adminAllotments(el) {
  const [allotRes, candRes, smRes] = await Promise.all([
    api('GET', '/allotments'),
    api('GET', '/candidates'),
    api('GET', '/seat-matrix'),
  ]);
  const allotments = allotRes.data || [];
  const candidates = candRes.data || [];
  const seatMatrix = smRes.data || [];

  el.innerHTML = `
    <div style="margin-top:20px;">
      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:16px;">Create / Update Allotment</h3>
        <div class="form-row">
          <div class="form-group"><label>Candidate</label>
            <select id="allot-cand">
              ${candidates.map(c => `<option value="${c.application_no}">${c.application_no} — ${c.first_name} ${c.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Seat Matrix Entry</label>
            <select id="allot-sm">
              ${seatMatrix.map(sm => `<option value="${sm.seatmatrix_id}">${sm.seatmatrix_id} | ${sm.institute_name} | ${sm.program_name} | ${sm.seat_type}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group" style="max-width:200px;">
          <label>Round Number</label>
          <input type="number" id="allot-round" value="1" min="1" max="6">
        </div>
        <button class="btn btn-primary" id="btn-allot">Save Allotment</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>App No</th><th>Name</th><th>Institute</th><th>Program</th><th>Quota</th><th>Seat Type</th><th>Round</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            ${allotments.map(a => `
              <tr>
                <td><code>${a.application_no}</code></td>
                <td>${a.name}</td>
                <td>${a.institute_name}</td>
                <td>${a.program_name}</td>
                <td><span class="badge badge-amber">${a.quota}</span></td>
                <td><span class="badge badge-blue">${a.seat_type}</span></td>
                <td>${a.round_no}</td>
                <td>${a.allotment_date}</td>
                <td><button class="btn btn-sm btn-danger" data-appno="${a.application_no}">Remove</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-allot').addEventListener('click', async () => {
    const res = await api('POST', '/allotment', {
      application_no: document.getElementById('allot-cand').value,
      seatmatrix_id: document.getElementById('allot-sm').value,
      round_no: document.getElementById('allot-round').value,
    });
    toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    if (res.status === 'ok') adminAllotments(el);
  });

  el.querySelectorAll('[data-appno]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove allotment for ' + btn.dataset.appno + '?')) return;
      const res = await api('DELETE', `/allotment/${btn.dataset.appno}`);
      toast(res.msg, res.status === 'ok' ? 'success' : 'error');
      if (res.status === 'ok') adminAllotments(el);
    });
  });
}

async function adminTickets(el) {
  const res = await api('GET', '/tickets/all');
  const tickets = res.data || [];

  el.innerHTML = `
    <div style="margin-top:20px;">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ticket ID</th><th>App No</th><th>Candidate</th><th>Category</th><th>Description</th><th>Created</th><th>Status</th><th>Update</th></tr></thead>
          <tbody>
            ${tickets.map(t => `
              <tr>
                <td><code>${t.ticket_id}</code></td>
                <td><code>${t.application_no}</code></td>
                <td>${t.candidate_name}</td>
                <td>${t.category}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.description}</td>
                <td>${t.created_at}</td>
                <td><span class="badge ${t.status === 'Open' ? 'badge-amber' : t.status === 'Resolved' ? 'badge-green' : 'badge-gray'}">${t.status}</span></td>
                <td>
                  <select class="ticket-status-sel" style="padding:4px 8px; border:1.5px solid #1a1a1a; font-size:0.75rem; background:var(--cream); font-family:var(--font);" data-tid="${t.ticket_id}">
                    <option ${t.status === 'Open' ? 'selected' : ''}>Open</option>
                    <option ${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option ${t.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                    <option ${t.status === 'Closed' ? 'selected' : ''}>Closed</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  el.querySelectorAll('.ticket-status-sel').forEach(sel => {
    sel.addEventListener('change', async () => {
      const res = await api('PUT', `/tickets/${sel.dataset.tid}/status`, { status: sel.value });
      toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    });
  });
}

async function adminChallenges(el) {
  const res = await api('GET', '/challenges/all');
  const challenges = res.data || [];

  el.innerHTML = `
    <div style="margin-top:20px;">
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>App No</th><th>Candidate</th><th>Question</th><th>Subject</th><th>NTA Ans</th><th>Claimed Ans</th><th>Fee TX</th><th>Status</th><th>Update</th></tr></thead>
          <tbody>
            ${challenges.map(ch => `
              <tr>
                <td><code>${ch.challenge_id}</code></td>
                <td><code>${ch.application_no}</code></td>
                <td>${ch.candidate_name}</td>
                <td><code>${ch.question_id}</code></td>
                <td>${ch.subject}</td>
                <td><strong>${ch.correct_ans}</strong></td>
                <td><strong>${ch.claimed_ans}</strong></td>
                <td><code>${ch.fee_transaction_id}</code></td>
                <td><span class="badge ${ch.challenge_status === 'Accepted' ? 'badge-green' : ch.challenge_status === 'Rejected' ? 'badge-red' : 'badge-amber'}">${ch.challenge_status}</span></td>
                <td>
                  <select class="challenge-status-sel" style="padding:4px 8px; border:1.5px solid #1a1a1a; font-size:0.75rem; background:var(--cream); font-family:var(--font);" data-cid="${ch.challenge_id}">
                    <option ${ch.challenge_status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option ${ch.challenge_status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                    <option ${ch.challenge_status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  el.querySelectorAll('.challenge-status-sel').forEach(sel => {
    sel.addEventListener('change', async () => {
      const res = await api('PUT', `/challenges/${sel.dataset.cid}/status`, { status: sel.value });
      toast(res.msg, res.status === 'ok' ? 'success' : 'error');
    });
  });
}
