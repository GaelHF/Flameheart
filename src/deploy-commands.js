import { REST, Routes } from 'discord.js';
import { commandsPayload } from './commands.js';
import { config, token } from './config.js';
import { log } from './log.js';

/** Enregistre les slash commands sur le serveur (mise à jour instantanée). */
export async function deployCommands() {
    const rest = new REST().setToken(token);
    const body = commandsPayload();

    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
    log.info(`⚡ ${body.length} commandes enregistrées.`);
}

// Permet aussi de déployer à la main : node src/deploy-commands.js
if (process.argv[1]?.endsWith('deploy-commands.js')) {
    deployCommands().catch((error) => {
        log.error('Déploiement des commandes :', error);
        process.exitCode = 1;
    });
}
