import { ChannelType, Events } from 'discord.js';
import { config, shipNames } from '../config.js';
import { log } from '../log.js';

const hubs = config.tempVoice;
const isHub = (channelId) => Object.hasOwn(hubs, channelId);
const prefixes = Object.values(hubs).map((hub) => hub.prefix);

// Salons temporaires connus : évite de supprimer un salon vocal permanent qui se
// retrouverait vide. Repeuplé au démarrage pour survivre à un redémarrage.
const tempChannels = new Set();

const randomShipName = () => shipNames[Math.floor(Math.random() * shipNames.length)];

/** Un salon créé par le bot : dans une catégorie de hub, nommé d'après un gabarit. */
const looksTemporary = (channel, hubCategories) =>
    channel.type === ChannelType.GuildVoice &&
    !isHub(channel.id) &&
    hubCategories.has(channel.parentId) &&
    prefixes.some((prefix) => channel.name.startsWith(`${prefix} `));

async function createShip(state, hub) {
    const channel = await state.guild.channels.create({
        name: `${hub.prefix} ${randomShipName()}`,
        type: ChannelType.GuildVoice,
        parent: state.channel.parent,
        userLimit: hub.userLimit
    });

    tempChannels.add(channel.id);
    await state.member.voice.setChannel(channel);
    log.info(`⚓ Navire créé : ${channel.name}`);
}

async function deleteIfEmpty(state) {
    const channel = state.channel;
    if (!channel || !tempChannels.has(channel.id) || channel.members.size > 0) return;

    tempChannels.delete(channel.id);
    try {
        await channel.delete('Salon temporaire vide');
        log.info(`🗑️ Navire coulé : ${channel.name}`);
    } catch (error) {
        log.error('Suppression du salon temporaire impossible :', error);
    }
}

export function registerTempVoice(client) {
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        if (oldState.channelId === newState.channelId) return;

        const hub = newState.channelId ? hubs[newState.channelId] : undefined;
        if (hub) {
            try {
                await createShip(newState, hub);
            } catch (error) {
                log.error('Création du salon temporaire impossible :', error);
            }
        }

        await deleteIfEmpty(oldState);
    });

    // Au démarrage : on réadopte les salons temporaires encore occupés et on
    // supprime ceux laissés vides par le redémarrage.
    client.once(Events.ClientReady, async () => {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) return;

        const hubCategories = new Set(
            Object.keys(hubs)
                .map((id) => guild.channels.cache.get(id)?.parentId)
                .filter(Boolean)
        );

        for (const channel of guild.channels.cache.values()) {
            if (!looksTemporary(channel, hubCategories)) continue;

            if (channel.members.size > 0) {
                tempChannels.add(channel.id);
            } else {
                await channel.delete('Salon temporaire orphelin').catch(() => {});
            }
        }
    });
}
