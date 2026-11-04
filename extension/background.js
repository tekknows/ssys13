const STORAGE_KEY = {
  config: 'config',
  policies: 'policies',
  usageQueue: 'usageQueue',
  lastSync: 'lastSync',
  lastError: 'lastError',
  device: 'device',
  incognitoBlockingEnabled: 'incognitoBlockingEnabled',
};

const DEMO_POLICIES = [
  {
    id: 'policy-demo-1',
    name: 'Workday social block',
    enabled: true,
    schedule: {
      mode: 'weekly',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      start: '09:00',
      end: '17:00',
    },
    domains: ['facebook.com', 'instagram.com', 'youtube.com'],
    version: 1,
  },
  {
    id: 'policy-demo-2',
    name: 'Gaming block',
    enabled: true,
    schedule: {
      mode: 'daily',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      start: '00:00',
      end: '23:59',
    },
    domains: ['steamcommunity.com', 'discord.com'],
    version: 1,
  },
];

function getDomainFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch (error) {
    return null;
  }
}

function parseTime(value) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value || '');
  if (!match) {
    return null;
  }
  const [hours, minutes] = match.slice(1).map(Number);
  return hours * 60 + minutes;
}

function isScheduleActive(policy) {
  const schedule = policy.schedule || policy.schedules || {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const currentDay = dayNames[now.getDay()];
  const startMinutes = parseTime(schedule.start || '00:00');
  const endMinutes = parseTime(schedule.end || '23:59');
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!schedule.days && !Array.isArray(schedule)) {
    return true;
  }

  const enabledDays = Array.isArray(schedule.days)
    ? schedule.days
    : Array.isArray(schedule)
      ? schedule
      : [];

  if (enabledDays.length && !enabledDays.includes(currentDay)) {
    return false;
  }

  if (startMinutes === null || endMinutes === null) {
    return true;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function isChromeOrEdgeBrowser() {
  const userAgent = navigator.userAgent || '';
  const brands = navigator.userAgentData?.brands?.map((brand) => brand.brand).join(' ') || '';
  return /Edg\//i.test(userAgent) || /EdgA\//i.test(userAgent) || /Edg/i.test(brands)
    || /Chrome\//i.test(userAgent) || /CriOS\//i.test(userAgent) || /Chrome/i.test(brands);
}

function buildRuleForDomain(domain, ruleId) {
  const cleanDomain = domain.replace(/^\.?/, '').replace(/\/$/, '');
  return {
    id: ruleId,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${cleanDomain}^`,
      resourceTypes: [
        'main_frame',
        'sub_frame',
        'stylesheet',
        'script',
        'image',
        'font',
        'object',
        'xmlhttprequest',
        'ping',
        'csp_report',
        'media',
        'websocket',
        'other',
      ],
    },
  };
}

async function getConfig() {
  const result = await chrome.storage.local.get(['supabaseUrl', 'supabaseAnonKey', 'apiBaseUrl', 'deviceId', 'deviceSecret']);
  return {
    supabaseUrl: result.supabaseUrl || '',
    supabaseAnonKey: result.supabaseAnonKey || '',
    apiBaseUrl: String(result.apiBaseUrl || '').replace(/\/+$/, ''),
    deviceId: result.deviceId || '',
    deviceSecret: result.deviceSecret || '',
  };
}

function getManagementApiUrl(config, path) {
  if (!config.apiBaseUrl) throw new Error('Configure the MINDLOCK management API URL in extension settings.');
  return new URL(path, `${config.apiBaseUrl}/`).toString();
}

function shouldCloseIncognitoTab(tab, enabled, incognitoAccessAllowed) {
  return Boolean(tab && Number.isInteger(tab.id) && tab.incognito && enabled && incognitoAccessAllowed);
}

function isIncognitoAccessAllowed() {
  return new Promise((resolve) => {
    if (!chrome.extension || typeof chrome.extension.isAllowedIncognitoAccess !== 'function') {
      resolve(false);
      return;
    }

    chrome.extension.isAllowedIncognitoAccess((allowed) => {
      resolve(!chrome.runtime.lastError && Boolean(allowed));
    });
  });
}

async function closeIncognitoTab(tab) {
  const { [STORAGE_KEY.incognitoBlockingEnabled]: enabled } = await chrome.storage.local.get([STORAGE_KEY.incognitoBlockingEnabled]);
  if (!tab?.incognito || !enabled || !Number.isInteger(tab.id)) return;

  const incognitoAccessAllowed = await isIncognitoAccessAllowed();
  await chrome.storage.local.set({ incognitoAccessAllowed });
  if (!shouldCloseIncognitoTab(tab, enabled, incognitoAccessAllowed)) {
    await chrome.storage.local.set({
      [STORAGE_KEY.lastError]: 'Incognito blocking is enabled, but this extension is not allowed in Incognito. Enable "Allow in Incognito" in the browser extension settings.',
    });
    return;
  }

  try {
    await chrome.tabs.remove(tab.id);
  } catch (error) {
    await chrome.storage.local.set({
      [STORAGE_KEY.lastError]: `Unable to close an Incognito tab: ${String(error.message || error)}`,
    });
  }
}

async function closeOpenIncognitoTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter((tab) => tab.incognito).map(closeIncognitoTab));
}

async function syncIncognitoControl(config, closeExistingTabs = true) {
  if (!isDeviceRegisteredForBlocking(config)) return false;

  try {
    const deviceId = encodeURIComponent(config.deviceId);
    const response = await fetch(getManagementApiUrl(config, `/api/agent/incognito-policy?deviceId=${deviceId}`), {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.deviceSecret}` },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Incognito control sync failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload.policyName !== 'incognito_blocking' || typeof payload.isEnabled !== 'boolean') {
      throw new Error('The management API returned an invalid Incognito policy.');
    }
    const enabled = payload.isEnabled;
    const incognitoAccessAllowed = await isIncognitoAccessAllowed();
    await chrome.storage.local.set({
      [STORAGE_KEY.incognitoBlockingEnabled]: enabled,
      incognitoAccessAllowed,
    });

    if (enabled && incognitoAccessAllowed && closeExistingTabs) {
      await closeOpenIncognitoTabs();
    } else if (enabled) {
      await chrome.storage.local.set({
        [STORAGE_KEY.lastError]: 'Incognito blocking is enabled, but this extension is not allowed in Incognito. Enable "Allow in Incognito" in the browser extension settings.',
      });
    }

    return true;
  } catch (error) {
    await chrome.storage.local.set({
      [STORAGE_KEY.lastError]: `Incognito control sync failed: ${String(error.message || error)}`,
    });
    return false;
  }
}
function isDeviceRegisteredForBlocking(config) {
  return Boolean(config.deviceId && config.deviceSecret && config.deviceId.trim() && config.deviceSecret.trim());
}

async function getPolicies() {
  const result = await chrome.storage.local.get([STORAGE_KEY.policies]);
  const raw = result[STORAGE_KEY.policies];
  return Array.isArray(raw) ? raw : DEMO_POLICIES;
}

async function applyPoliciesToBrowser() {
  const config = await getConfig();

  if (!isDeviceRegisteredForBlocking(config)) {
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = currentRules.map((rule) => rule.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [],
    });
    await chrome.storage.local.set({
      [STORAGE_KEY.lastError]: 'Website blocking is disabled because this device is not registered in the admin interface.',
    });
    return;
  }

  if (!isChromeOrEdgeBrowser()) {
    await chrome.storage.local.set({
      [STORAGE_KEY.lastError]: 'Incognito blocking is only supported in Chrome and Edge managed browsers.',
    });
    return;
  }

  const policies = await getPolicies();
  const rules = [];

  policies.forEach((policy, policyIndex) => {
    if (!policy || !policy.enabled) {
      return;
    }

    const policyActive = isScheduleActive(policy);
    if (!policyActive) {
      return;
    }

    const domains = Array.isArray(policy.domains) ? policy.domains : [];
    domains.forEach((domain, domainIndex) => {
      const cleanDomain = getDomainFromUrl(`https://${domain}`) || domain;
      if (!cleanDomain) {
        return;
      }
      const ruleId = Number(`${policyIndex + 1}${domainIndex + 1}`) * 10 + 1;
      rules.push(buildRuleForDomain(cleanDomain, ruleId));
    });
  });

  const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = currentRules.map((rule) => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: rules,
  });

  await chrome.storage.local.set({ [STORAGE_KEY.lastSync]: new Date().toISOString() });
}

async function syncPolicies() {
  const config = await getConfig();
  await syncIncognitoControl(config);
  const deviceId = config.deviceId;

  if (!isDeviceRegisteredForBlocking(config)) {
    await chrome.storage.local.set({ [STORAGE_KEY.policies]: [] });
    await applyPoliciesToBrowser();
    await chrome.storage.local.set({ [STORAGE_KEY.lastError]: 'Website blocking is disabled until the device is registered in the admin interface.' });
    return { ok: false, mode: 'unregistered' };
  }

  try {
    const response = await fetch(
      getManagementApiUrl(config, `/api/agent/blocking-policies?deviceId=${encodeURIComponent(deviceId)}`),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.deviceSecret}` },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(`Management API policy sync failed with status ${response.status}`);
    }

    const payload = await response.json();
    const assignedPolicies = Array.isArray(payload.policies) ? payload.policies : [];
    const normalizedPolicies = assignedPolicies.map((policy) => ({
          id: policy.id,
          name: policy.name || 'Policy',
          enabled: Boolean(policy.enabled ?? policy.is_enabled),
          domains: Array.isArray(policy.domains) ? policy.domains : [],
          schedule: policy.schedule || { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '09:00', end: '17:00' },
          version: policy.version || 1,
          deviceId,
        }));

    await chrome.storage.local.set({ [STORAGE_KEY.policies]: normalizedPolicies });
    await applyPoliciesToBrowser();
    await chrome.storage.local.set({ [STORAGE_KEY.lastError]: null });

    return { ok: true, mode: 'backend' };
  } catch (error) {
    await chrome.storage.local.set({ [STORAGE_KEY.lastError]: String(error.message || error) });
    return { ok: false, mode: 'offline' };
  }
}

async function enqueueVisit(record) {
  const result = await chrome.storage.local.get([STORAGE_KEY.usageQueue]);
  const queue = Array.isArray(result[STORAGE_KEY.usageQueue]) ? result[STORAGE_KEY.usageQueue] : [];
  queue.push(record);
  await chrome.storage.local.set({ [STORAGE_KEY.usageQueue]: queue.slice(-100) });
}

async function flushUsageQueue() {
  const config = await getConfig();
  const result = await chrome.storage.local.get([STORAGE_KEY.usageQueue]);
  const queue = Array.isArray(result[STORAGE_KEY.usageQueue]) ? result[STORAGE_KEY.usageQueue] : [];

  if (!queue.length || !config.apiBaseUrl || !config.deviceId || !config.deviceSecret) {
    return;
  }

  try {
    const response = await fetch(getManagementApiUrl(config, '/api/agent/usage-events'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deviceSecret}`,
      },
      body: JSON.stringify({ deviceId: config.deviceId, events: queue }),
    });

    if (!response.ok) {
      throw new Error(`Usage upload failed: ${response.status}`);
    }

    await chrome.storage.local.set({ [STORAGE_KEY.usageQueue]: [] });
  } catch (error) {
    await chrome.storage.local.set({ [STORAGE_KEY.lastError]: `Usage sync error: ${String(error.message || error)}` });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const config = await getConfig();
  await chrome.storage.local.set({ [STORAGE_KEY.device]: { id: config.deviceId } });
  await syncPolicies();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncPolicies();
});

chrome.alarms.create('policy-sync', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'policy-sync') {
    await syncPolicies();
    await flushUsageQueue();
  }
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  if (changes[STORAGE_KEY.policies]) {
    await applyPoliciesToBrowser();
  }

  const configurationChanged = ['supabaseUrl', 'supabaseAnonKey', 'apiBaseUrl', 'deviceId', 'deviceSecret']
    .some((key) => changes[key]);
  if (configurationChanged) {
    await syncPolicies();
  }
});

async function handleIncognitoTabCreated(tab) {
  if (!tab?.incognito) return;

  await closeIncognitoTab(tab);

  const config = await getConfig();
  const synced = await syncIncognitoControl(config, false);
  if (synced) {
    await closeIncognitoTab(tab);
  }
}

chrome.tabs.onCreated.addListener((tab) => {
  handleIncognitoTabCreated(tab).catch((error) => {
    console.error('Unable to check Incognito policy after a tab was opened.', error);
  });
});

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (!details.url || !details.tabId) {
    return;
  }

  const domain = getDomainFromUrl(details.url);
  if (!domain) {
    return;
  }

  const config = await getConfig();
  const policies = await getPolicies();
  const blocked = policies.some((policy) => {
    if (!policy || !policy.enabled) {
      return false;
    }
    const policyActive = isScheduleActive(policy);
    if (!policyActive) {
      return false;
    }
    return (policy.domains || []).some((candidate) => {
      const normalizedCandidate = getDomainFromUrl(`https://${candidate}`) || candidate;
      return normalizedCandidate === domain;
    });
  });

  const event = {
    device_id: config.deviceId,
    domain,
    timestamp: new Date(details.timeStamp).toISOString(),
    duration_seconds: 0,
    blocked,
    policy_id: blocked ? 'matched-policy' : null,
  };

  await enqueueVisit(event);
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (!details.url) {
    return;
  }

  const domain = getDomainFromUrl(details.url);
  if (!domain) {
    return;
  }

  const config = await getConfig();
  const policies = await getPolicies();
  const matched = policies.find((policy) => {
    if (!policy || !policy.enabled || !isScheduleActive(policy)) {
      return false;
    }
    return (policy.domains || []).some((candidate) => (getDomainFromUrl(`https://${candidate}`) || candidate) === domain);
  });

  if (matched) {
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        buildRuleForDomain(domain, Date.now()),
      ],
    });
    await chrome.storage.local.set({
      [STORAGE_KEY.lastError]: `Blocked navigation to ${domain} by policy: ${matched.name || matched.id}`,
    });
  }

  await flushUsageQueue();
  await chrome.storage.local.set({ [STORAGE_KEY.device]: { id: config.deviceId, lastSeen: new Date().toISOString() } });
});

async function initialize() {
  await syncPolicies();
  await flushUsageQueue();
}

initialize();
