export const reset = async () => { const db = await import('../storage/db.js'); await db.clearAll(); const s = await import('../storage/settings.js'); await s.resetSettings(); };
