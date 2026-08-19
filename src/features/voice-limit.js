import { Events } from 'discord.js';
import { log } from '../log.js';

const MAX_USER_LIMIT = 99;

// Salons dont la limite a été augmentée par le bot : on ne la réduit que dans ce cas.
const raised = new Set();

/** Décale la limite d'un salon vocal. Ignore les salons sans limite (0 = illimité). */
async function shift(channel, delta, reason) {
    if (!channel || channel.userLimit === 0) return false;

    const limit = Math.min(Math.max(channel.userLimit + delta, 1), MAX_USER_LIMIT);
    if (limit === channel.userLimit) return false;

    try {
        await channel.setUserLimit(limit, reason);
        return true;
    } catch (error) {
        log.error(`Limite du salon "${channel.name}" :`, error);
        return false;
    }
}

/** Le bot ne doit pas prendre une place : +1 quand il entre, -1 quand il sort. */
export function registerVoiceLimit(client) {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        if (newState.id !== client.user.id) return;
        if (oldState.channelId === newState.channelId) return;

        if (oldState.channelId && raised.delete(oldState.channelId)) {
            if (await shift(oldState.channel, -1, 'Flameheart quitte le salon')) {
                log.info(`🔓 Limite de "${oldState.channel?.name}" réduite de 1`);
            }
        }

        if (newState.channelId && (await shift(newState.channel, +1, 'Flameheart rejoint le salon'))) {
            raised.add(newState.channelId);
            log.info(`🔒 Limite de "${newState.channel.name}" augmentée de 1`);
        }
    });
}
