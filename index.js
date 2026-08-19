import { ActivityType, Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { commands } from './src/commands.js';
import { token } from './src/config.js';
import { deployCommands } from './src/deploy-commands.js';
import { registerGoldRush } from './src/features/gold-rush.js';
import { registerTempVoice } from './src/features/temp-voice.js';
import { handleTicketButton } from './src/features/tickets.js';
import { registerVoiceLimit } from './src/features/voice-limit.js';
import { registerWelcome } from './src/features/welcome.js';
import { registerMusic } from './src/music.js';
import { log } from './src/log.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates]
});

registerWelcome(client);
registerTempVoice(client);
registerGoldRush(client);
registerMusic(client);
registerVoiceLimit(client);

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = commands.get(interaction.commandName);
            if (!command) return;
            await command.execute(interaction);
            return;
        }

        if (interaction.isButton()) {
            await handleTicketButton(interaction);
        }
    } catch (error) {
        log.error(`Interaction "${interaction.customId ?? interaction.commandName}" :`, error);

        const message = {
            content: "❌ Une erreur est survenue, l'équipage a été prévenu.",
            flags: MessageFlags.Ephemeral
        };

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp(message).catch(() => {});
        } else {
            await interaction.reply(message).catch(() => {});
        }
    }
});

client.once(Events.ClientReady, async (readyClient) => {
    readyClient.user.setActivity({ name: 'Sea of Thieves', type: ActivityType.Playing });
    log.info(`${readyClient.user.tag} est connecté au réseau de Discord.`);

    await deployCommands().catch((error) => log.error('Déploiement des commandes :', error));
});

client.on(Events.Error, (error) => log.error('Erreur du client :', error));
process.on('unhandledRejection', (error) => log.error('Promesse rejetée :', error));

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, async () => {
        log.info('Arrêt en cours...');
        await client.destroy();
        process.exit(0);
    });
}

await client.login(token);