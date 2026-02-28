let selectedDuration = 25;
let timerInterval = null;
let sessionActive = false;
let sessionStart = null;
let sessionDuration = 0;

const timer = document.getElementById('timer');
const mainBtn = document.getElementById('mainBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const progressBar = document.getElementById('progressBar');
const sitesList = document.getElementById('sitesList');
const siteInput = document.getElementById('siteInput');
const durationRow = document.getElementById('durationRow');


async function init() {
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (state) => {
    if (state && state.sessionActive) {
      sessionActive = true;
      sessionStart = state.sessionStart;
      sessionDuration = state.sessionDuration;
      setActiveUI();
      startTimerTick();
    }
  });

  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  renderSites(blockedSites);
}


durationRow.addEventListener('click', (e) => {
  if (sessionActive) return;
  const btn = e.target.closest('.dur-btn');
  if (!btn) return;
  document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedDuration = parseInt(btn.dataset.mins);
});


mainBtn.addEventListener('click', async () => {
  if (!sessionActive) {
    sessionStart = Date.now();
    sessionDuration = selectedDuration;
    sessionActive = true;

    chrome.runtime.sendMessage({ type: 'START_SESSION', duration: selectedDuration });
    setActiveUI();
    startTimerTick();
  } else {
    sessionActive = false;
    clearInterval(timerInterval);
    chrome.runtime.sendMessage({ type: 'END_SESSION' });
    setIdleUI();
  }
});

function setActiveUI() {
  mainBtn.textContent = 'END SESSION';
  mainBtn.className = 'main-btn stop';
  statusDot.classList.add('active');
  statusText.textContent = 'focusing...';
  timer.classList.remove('idle');
  durationRow.style.opacity = '0.3';
  durationRow.style.pointerEvents = 'none';
}

function setIdleUI() {
  mainBtn.textContent = 'START SESSION';
  mainBtn.className = 'main-btn start';
  statusDot.classList.remove('active');
  statusText.textContent = 'ready to focus';
  timer.classList.add('idle');
  timer.textContent = '00:00';
  progressBar.style.width = '0%';
  durationRow.style.opacity = '1';
  durationRow.style.pointerEvents = 'auto';
}

function startTimerTick() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!sessionActive) { clearInterval(timerInterval); return; }

    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    const totalSecs = sessionDuration * 60;
    const remaining = Math.max(totalSecs - elapsed, 0);

    const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
    const secs = (remaining % 60).toString().padStart(2, '0');
    timer.textContent = `${mins}:${secs}`;

    const pct = Math.min(((elapsed / totalSecs) * 100), 100);
    progressBar.style.width = pct + '%';

    if (remaining === 0) {
      clearInterval(timerInterval);
      sessionActive = false;
      statusText.textContent = '✓ session complete!';
      setTimeout(setIdleUI, 2000);
    }
  }, 1000);
}


document.getElementById('addBtn').addEventListener('click', addSite);
siteInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addSite(); });

async function addSite() {
  let val = siteInput.value.trim().toLowerCase();
  if (!val) return;

  val = val.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  if (!val) return;

  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  if (blockedSites.includes(val)) { siteInput.value = ''; return; }

  blockedSites.push(val);
  await chrome.storage.local.set({ blockedSites });
  chrome.runtime.sendMessage({ type: 'UPDATE_SITES' });
  siteInput.value = '';
  renderSites(blockedSites);
}

async function removeSite(site) {
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  const updated = blockedSites.filter(s => s !== site);
  await chrome.storage.local.set({ blockedSites: updated });
  chrome.runtime.sendMessage({ type: 'UPDATE_SITES' });
  renderSites(updated);
}

function renderSites(sites) {
  if (!sites.length) {
    sitesList.innerHTML = '<div class="empty-sites">no sites blocked yet</div>';
    return;
  }
  sitesList.innerHTML = sites.map(site => `
    <div class="site-item">
      <span class="site-name">${site}</span>
      <button class="remove-btn" data-site="${site}">✕</button>
    </div>
  `).join('');

  sitesList.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeSite(btn.dataset.site));
  });
}


document.getElementById('dashBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

init();
