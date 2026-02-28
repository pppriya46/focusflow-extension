
let sessionActive = false;
let sessionStart = null;


async function rebuildRules() {
  const { blockedSites = [] } = await chrome.storage.local.get('blockedSites');
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);

  const addRules = blockedSites.map((site, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
    condition: {
      urlFilter: site,
      resourceTypes: ['main_frame']
    }
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules });
}


async function startSession(durationMins) {
  sessionActive = true;
  sessionStart = Date.now();

  await chrome.storage.local.set({
    sessionActive: true,
    sessionStart: sessionStart,
    sessionDuration: durationMins
  });

  chrome.alarms.create('sessionEnd', { delayInMinutes: durationMins });
  await rebuildRules();
}

async function endSession(completed = true) {
  if (!sessionActive && !sessionStart) return;

  const { sessionStart: start, sessionDuration: dur, sessions = [] } = await chrome.storage.local.get(['sessionStart', 'sessionDuration', 'sessions']);

  const actualDuration = Math.round((Date.now() - (start || Date.now())) / 60000);

  sessions.push({
    date: new Date().toISOString(),
    plannedMins: dur || 0,
    actualMins: actualDuration,
    completed
  });

  sessionActive = false;
  sessionStart = null;

  await chrome.storage.local.set({
    sessionActive: false,
    sessionStart: null,
    sessions
  });

  chrome.alarms.clear('sessionEnd');
}


chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !tab.url.includes('blocked.html')) return;

  const url = new URL(tab.url);
  const attempted = url.searchParams.get('attempted') || '';
  if (!attempted) return;

  const { attempts = {} } = await chrome.storage.local.get('attempts');
  const domain = attempted;
  attempts[domain] = (attempts[domain] || 0) + 1;
  await chrome.storage.local.set({ attempts });
});


chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sessionEnd') {
    await endSession(true);
  }
});


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'START_SESSION') {
    startSession(msg.duration).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'END_SESSION') {
    endSession(false).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'UPDATE_SITES') {
    rebuildRules().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'GET_STATE') {
    chrome.storage.local.get(['sessionActive', 'sessionStart', 'sessionDuration'], (data) => {
      sendResponse(data);
    });
    return true;
  }
});

rebuildRules();
