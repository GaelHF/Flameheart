import { EmbedBuilder, Events } from 'discord.js';
import cron from 'node-cron';
import { config } from '../config.js';
import { log } from '../log.js';

// Heure de fin de l'événement, en heure du Québec.
const SCHEDULE = [
    { cron: '0 13 * * *', endsAt: 14 },
    { cron: '0 21 * * *', endsAt: 22 }
];

const UTC_OFFSET_FR = 6; // décalage Québec -> France

export async function announceGoldRush(client, endsAtQC) {
    const channel = await client.channels.fetch(config.channels.goldRush).catch(() => null);
    if (!channel?.isTextBased()) {
        log.error('Salon du Gold Rush introuvable.');
        return;
    }

    const endsAtFR = (endsAtQC + UTC_OFFSET_FR) % 24;

    const embed = new EmbedBuilder()
        .setColor('#ffe600')
        .setTitle(`Gold Rush ${config.emojis.gold}`)
        .setDescription(
            `> Profitez du **Gold Rush** qui vous donne un x1,5 sur tous vos trésors. Il se termine à **${endsAtQC}h** (QC) ou **${endsAtFR}h** (FR)`
        )
        .setThumbnail(config.assets.goldRushIcon)
        .setTimestamp();

    await channel
        .send({ content: `<@&${config.roles.goldRush}>`, embeds: [embed] })
        .then(() => log.info(`🪙 Gold Rush annoncé (fin ${endsAtQC}h QC)`))
        .catch((error) => log.error('Annonce du Gold Rush :', error));
}

export function registerGoldRush(client) {
    client.once(Events.ClientReady, () => {
        for (const { cron: expression, endsAt } of SCHEDULE) {
            cron.schedule(expression, () => announceGoldRush(client, endsAt), {
                timezone: config.timezone
            });
        }

        log.info(`🪙 Gold Rush planifié (${SCHEDULE.length} annonces / jour, ${config.timezone})`);
    });
}
