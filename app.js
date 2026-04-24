// ============================================================
// L4D2 SURVIVOR LOG — app.js
// ============================================================

const API_BASE = 'http://localhost:3000/api';
const MISSIONS_URL = `${API_BASE}/missions`;
const SURVIVORS_URL = `${API_BASE}/survivors`;

// ============================================================
// TAB NAVIGATION
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ============================================================
// UTILITIES
// ============================================================
function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function showMsg(id, text, ok = true) {
  const el = document.getElementById(id);
  el.textContent = `› ${text}`;
  el.style.color = ok ? 'var(--yellow-bright)' : 'var(--red-bright)';
  setTimeout(() => { el.textContent = ''; }, 3500);
}

function diffBadge(diff) {
  return `<span class="badge badge-diff-${diff}">${diff.toUpperCase()}</span>`;
}

function statusBadge(status) {
  return `<span class="badge badge-status-${status}">${status.toUpperCase()}</span>`;
}

// ============================================================
// MISSIONS — CRUD
// ============================================================
const missionForm    = document.getElementById('mission-form');
const missionIdField = document.getElementById('mission-id');
const missionFormTitle = document.getElementById('mission-form-title');
const missionCancel  = document.getElementById('mission-cancel');
const missionsList   = document.getElementById('missions-list');

function clearMissionForm() {
  missionForm.reset();
  missionIdField.value = '';
  missionFormTitle.textContent = 'REGISTRAR MISSÃO';
  missionCancel.classList.add('hidden');
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('playedAt').value = now.toISOString().slice(0, 16);
  document.getElementById('deaths').value = 0;
  document.getElementById('completed').checked = false;
}

async function loadMissions() {
  try {
    const res = await fetch(MISSIONS_URL);
    if (!res.ok) throw new Error('Erro ao carregar');
    const missions = await res.json();
    renderMissions(missions);
  } catch (e) {
    missionsList.innerHTML = `<div class="empty-state"><span class="empty-icon">📡</span>FALHA NA CONEXÃO COM O SERVIDOR</div>`;
  }
}

function renderMissions(missions) {
  if (!missions.length) {
    missionsList.innerHTML = `<div class="empty-state"><span class="empty-icon">☠</span>NENHUMA MISSÃO REGISTRADA<br><small>Adicione sua primeira missão</small></div>`;
    return;
  }
  missionsList.innerHTML = missions.map(m => `
    <div class="entry-item">
      <div class="entry-header">
        <span class="entry-campaign">${m.campaign}</span>
        <span class="entry-date">${formatDate(m.playedAt)}</span>
      </div>
      <div class="entry-meta">
        ${diffBadge(m.difficulty)}
        <span class="badge ${m.completed ? 'badge-completed' : 'badge-incomplete'}">
          ${m.completed ? '✓ CONCLUÍDA' : '✗ INCOMPLETA'}
        </span>
        <span class="badge" style="background:rgba(100,100,100,0.15);color:var(--red-bright);border:1px solid var(--border);">
          💀 ${m.deaths} MORTES
        </span>
      </div>
      ${m.survivors && m.survivors.length
        ? `<div class="entry-survivors">EQUIPE: <span>${m.survivors.join(' · ')}</span></div>`
        : ''}
      ${m.notes ? `<div class="entry-notes">"${m.notes}"</div>` : ''}
      <div class="entry-actions">
        <button class="btn-edit" onclick="editMission('${m._id}')">✎ EDITAR</button>
        <button class="btn-delete" onclick="deleteMission('${m._id}')">✕ EXCLUIR</button>
      </div>
    </div>
  `).join('');
}

window.editMission = async function(id) {
  try {
    const res = await fetch(`${MISSIONS_URL}/${id}`);
    const m = await res.json();
    missionIdField.value = m._id;
    document.getElementById('campaign').value = m.campaign;
    document.getElementById('difficulty').value = m.difficulty;
    document.getElementById('deaths').value = m.deaths;
    document.getElementById('survivors-input').value = (m.survivors || []).join(', ');
    document.getElementById('completed').checked = m.completed;
    document.getElementById('mission-notes').value = m.notes || '';
    const d = new Date(m.playedAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById('playedAt').value = d.toISOString().slice(0, 16);
    missionFormTitle.textContent = 'EDITAR MISSÃO';
    missionCancel.classList.remove('hidden');
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
    showMsg('mission-message', 'Editando missão. Altere os campos e salve.');
  } catch (e) {
    showMsg('mission-message', 'Erro ao carregar missão.', false);
  }
};

window.deleteMission = async function(id) {
  if (!confirm('⚠ CONFIRMAR EXCLUSÃO DA MISSÃO?')) return;
  try {
    const res = await fetch(`${MISSIONS_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showMsg('mission-message', 'Missão excluída.');
    loadMissions();
  } catch (e) {
    showMsg('mission-message', 'Erro ao excluir missão.', false);
  }
};

missionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = missionIdField.value;
  const rawSurvivors = document.getElementById('survivors-input').value;
  const data = {
    campaign:   document.getElementById('campaign').value,
    difficulty: document.getElementById('difficulty').value,
    deaths:     parseInt(document.getElementById('deaths').value) || 0,
    survivors:  rawSurvivors ? rawSurvivors.split(',').map(s => s.trim()).filter(Boolean) : [],
    completed:  document.getElementById('completed').checked,
    notes:      document.getElementById('mission-notes').value,
    playedAt:   document.getElementById('playedAt').value
  };
  try {
    const url    = id ? `${MISSIONS_URL}/${id}` : MISSIONS_URL;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
    showMsg('mission-message', id ? 'Missão atualizada com sucesso.' : 'Missão registrada com sucesso.');
    clearMissionForm();
    loadMissions();
  } catch (err) {
    showMsg('mission-message', err.message || 'Erro ao salvar missão.', false);
  }
});

missionCancel.addEventListener('click', () => {
  clearMissionForm();
  showMsg('mission-message', 'Edição cancelada.');
});

document.getElementById('mission-reload').addEventListener('click', loadMissions);

// ============================================================
// SURVIVORS — CRUD
// ============================================================
const survivorForm     = document.getElementById('survivor-form');
const survivorIdField  = document.getElementById('survivor-id');
const survivorFormTitle = document.getElementById('survivor-form-title');
const survivorCancel   = document.getElementById('survivor-cancel');
const survivorsList    = document.getElementById('survivors-list');

function clearSurvivorForm() {
  survivorForm.reset();
  survivorIdField.value = '';
  survivorFormTitle.textContent = 'REGISTRAR SOBREVIVENTE';
  survivorCancel.classList.add('hidden');
  document.getElementById('s-status').value = 'Alive';
  document.getElementById('s-kills').value = 0;
  document.getElementById('s-rescues').value = 0;
}

async function loadSurvivors() {
  try {
    const res = await fetch(SURVIVORS_URL);
    if (!res.ok) throw new Error();
    const survivors = await res.json();
    renderSurvivors(survivors);
  } catch (e) {
    survivorsList.innerHTML = `<div class="empty-state"><span class="empty-icon">📡</span>FALHA NA CONEXÃO COM O SERVIDOR</div>`;
  }
}

function renderSurvivors(survivors) {
  if (!survivors.length) {
    survivorsList.innerHTML = `<div class="empty-state"><span class="empty-icon">👥</span>NENHUM SOBREVIVENTE REGISTRADO</div>`;
    return;
  }
  survivorsList.innerHTML = survivors.map(s => `
    <div class="entry-item">
      <div class="entry-header">
        <div class="survivor-name-block">
          <span class="survivor-name">${s.name}</span>
          ${s.nickname ? `<span class="survivor-nick">"${s.nickname}"</span>` : ''}
        </div>
        ${statusBadge(s.status)}
      </div>
      <div class="entry-meta">
        <span class="badge" style="background:rgba(100,100,100,0.1);color:var(--yellow-bright);border:1px solid var(--border);">
          ${s.role.toUpperCase()}
        </span>
      </div>
      <div class="survivor-stats">
        <div class="stat-block">
          <span class="stat-value">${s.kills}</span>
          <span class="stat-label">KILLS</span>
        </div>
        <div class="stat-block">
          <span class="stat-value">${s.rescues}</span>
          <span class="stat-label">RESGATES</span>
        </div>
      </div>
      ${s.bio ? `<div class="survivor-bio">"${s.bio}"</div>` : ''}
      <div class="entry-actions">
        <button class="btn-edit" onclick="editSurvivor('${s._id}')">✎ EDITAR</button>
        <button class="btn-delete" onclick="deleteSurvivor('${s._id}')">✕ EXCLUIR</button>
      </div>
    </div>
  `).join('');
}

window.editSurvivor = async function(id) {
  try {
    const res = await fetch(`${SURVIVORS_URL}/${id}`);
    const s = await res.json();
    survivorIdField.value = s._id;
    document.getElementById('s-name').value    = s.name;
    document.getElementById('s-nickname').value = s.nickname || '';
    document.getElementById('s-role').value    = s.role;
    document.getElementById('s-status').value  = s.status;
    document.getElementById('s-kills').value   = s.kills;
    document.getElementById('s-rescues').value = s.rescues;
    document.getElementById('s-bio').value     = s.bio || '';
    survivorFormTitle.textContent = 'EDITAR SOBREVIVENTE';
    survivorCancel.classList.remove('hidden');
    document.querySelector('#tab-survivors .form-card').scrollIntoView({ behavior: 'smooth' });
    showMsg('survivor-message', 'Editando sobrevivente.');
  } catch (e) {
    showMsg('survivor-message', 'Erro ao carregar sobrevivente.', false);
  }
};

window.deleteSurvivor = async function(id) {
  if (!confirm('⚠ CONFIRMAR EXCLUSÃO DO SOBREVIVENTE?')) return;
  try {
    const res = await fetch(`${SURVIVORS_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showMsg('survivor-message', 'Sobrevivente removido.');
    loadSurvivors();
  } catch (e) {
    showMsg('survivor-message', 'Erro ao excluir sobrevivente.', false);
  }
};

survivorForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = survivorIdField.value;
  const data = {
    name:     document.getElementById('s-name').value,
    nickname: document.getElementById('s-nickname').value,
    role:     document.getElementById('s-role').value,
    status:   document.getElementById('s-status').value,
    kills:    parseInt(document.getElementById('s-kills').value) || 0,
    rescues:  parseInt(document.getElementById('s-rescues').value) || 0,
    bio:      document.getElementById('s-bio').value
  };
  try {
    const url    = id ? `${SURVIVORS_URL}/${id}` : SURVIVORS_URL;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
    showMsg('survivor-message', id ? 'Sobrevivente atualizado.' : 'Sobrevivente registrado.');
    clearSurvivorForm();
    loadSurvivors();
  } catch (err) {
    showMsg('survivor-message', err.message || 'Erro ao salvar sobrevivente.', false);
  }
});

survivorCancel.addEventListener('click', () => {
  clearSurvivorForm();
  showMsg('survivor-message', 'Edição cancelada.');
});

document.getElementById('survivor-reload').addEventListener('click', loadSurvivors);

// ============================================================
// SERVICE WORKER (PWA)
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./service-worker.js');
      console.log('[PWA] Service Worker registrado.');
    } catch (err) {
      console.warn('[PWA] Erro no Service Worker:', err);
    }
  });
}

// ============================================================
// INIT
// ============================================================
clearMissionForm();
clearSurvivorForm();
loadMissions();
loadSurvivors();
