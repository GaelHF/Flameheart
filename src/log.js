const stamp = () =>
    new Date().toLocaleTimeString('fr-FR', { hour12: false, timeZone: 'America/Toronto' });

export const log = {
    info: (...args) => console.log(`[CF ${stamp()}]`, ...args),
    warn: (...args) => console.warn(`[CF ${stamp()}] ⚠️`, ...args),
    error: (...args) => console.error(`[CF ${stamp()}] ❌`, ...args)
};
