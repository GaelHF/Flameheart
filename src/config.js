import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (name) =>
    JSON.parse(readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8'));

export const config = read('config.json');
export const shipNames = read('tvt.json');

export const token = process.env.TOKEN ?? process.env.DISCORD_TOKEN;

if (!token) {
    throw new Error('TOKEN manquant : copie .env.example en .env et renseigne le token du bot.');
}
