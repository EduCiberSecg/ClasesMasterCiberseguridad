// Service worker MV3: sin estado en memoria; todo se recalcula desde almacenamiento.
import { countPendingCritical } from '../modules/alerts/alerts.js';

const MENU_ID = 'cyberadmin-analyze-link';
const DASH = 'dashboard/index.html';

async function refreshBadge() {
  try {
    const n = await countPendingCritical();
    await chrome.action.setBadgeText({ text: n > 0 ? String(Math.min(n, 99)) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#ff3b5c' });
  } catch (e) { console.warn('[CyberAdmin] badge', e?.message); }
}
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ID, title: 'Analizar enlace con CyberAdmin (local)', contexts: ['link'] });
  });
  chrome.alarms.create('badge', { periodInMinutes: 5 });
  refreshBadge();
});
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'badge') refreshBadge(); });

// El enlace NUNCA se envía a ningún servicio: solo se abre el analizador local con la URL precargada.
chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID || !info.linkUrl) return;
  chrome.tabs.create({ url: chrome.runtime.getURL(`${DASH}#/phishing?u=${encodeURIComponent(info.linkUrl.slice(0, 2048))}`) });
});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false; // solo mensajes de la propia extensión
  if (msg?.type === 'refresh-badge') { refreshBadge().then(() => sendResponse({ ok: true })); return true; }
  return false;
});
chrome.notifications.onClicked.addListener((id) => {
  if (id.startsWith('alert-')) chrome.tabs.create({ url: chrome.runtime.getURL(`${DASH}#/alerts`) });
});
