import {
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel
} from '@discordjs/voice';
import {
    Events,
    InteractionContextType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} from 'discord.js';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { log } from './log.js';

const trackPath = (file) => fileURLToPath(new URL(`../music/${file}`, import.meta.url));

/** Une session de lecture par serveur : { player, channelId, file }. Le bot ne peut être que dans un vocal à la fois. */
const sessions = new Map();

const playTrack = (player, file) => player.play(createAudioResource(createReadStream(trackPath(file))));

/** Coupe la musique et quitte le vocal. Renvoie le nom du fichier arrêté, ou null si rien ne jouait. */
function stopSession(guildId) {
    const session = sessions.get(guildId);
    if (!session) return null;

    sessions.delete(guildId);
    session.player.stop(true);

    const connection = getVoiceConnection(guildId);
    if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
    }

    log.info(`🎵 ${session.file} arrêté (serveur ${guildId})`);
    return session.file;
}

async function startSession(channel, file) {
    const guildId = channel.guild.id;

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false
    });

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });

    // La boucle : dès que la piste se termine, on la relance.
    player.on(AudioPlayerStatus.Idle, () => {
        if (sessions.get(guildId)?.player === player) playTrack(player, file);
    });

    player.on('error', (error) => {
        log.error(`Lecture de ${file} :`, error);
        if (sessions.get(guildId)?.player === player) playTrack(player, file);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
            ]);
        } catch {
            stopSession(guildId);
        }
    });

    connection.subscribe(player);
    sessions.set(guildId, { player, channelId: channel.id, file });

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (error) {
        stopSession(guildId);
        throw error;
    }

    playTrack(player, file);
    log.info(`🎵 ${file} en boucle dans "${channel.name}"`);
}

/** Construit une commande qui joue `file` en boucle : relancer la même commande arrête, une autre bascule de piste. */
export function createMusicCommand({ name, file }) {
    return {
        data: new SlashCommandBuilder()
            .setName(name)
            .setDescription(`Rejoint ton salon vocal et joue ${file} en boucle (relance la commande pour arrêter).`)
            .setContexts(InteractionContextType.Guild),
        async execute(interaction) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Deuxième appel de la même commande = interrupteur d'arrêt.
            if (sessions.get(interaction.guildId)?.file === file) {
                stopSession(interaction.guildId);
                await interaction.editReply('⏹️ Musique arrêtée, je quitte le vocal.');
                return;
            }

            const channel = interaction.member?.voice?.channel;
            if (!channel) {
                await interaction.editReply("❌ Rejoins d'abord un salon vocal.");
                return;
            }

            const permissions = channel.permissionsFor(interaction.guild.members.me);
            if (!permissions?.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak)) {
                await interaction.editReply("❌ Je n'ai pas la permission de me connecter ou de parler dans ce salon.");
                return;
            }

            // Une autre piste tourne : on la coupe avant de basculer.
            stopSession(interaction.guildId);

            await startSession(channel, file);
            await interaction.editReply(
                `🎵 **${file}** en boucle dans **${channel.name}** — relance \`/${name}\` pour arrêter.`
            );
        }
    };
}

/** Quitte automatiquement le vocal si plus personne n'écoute. */
export function registerMusic(client) {
    client.on(Events.VoiceStateUpdate, (oldState) => {
        const session = sessions.get(oldState.guild.id);
        if (!session || oldState.channelId !== session.channelId) return;

        const channel = oldState.guild.channels.cache.get(session.channelId);
        const listeners = channel?.members.filter((member) => !member.user.bot).size ?? 0;

        if (listeners === 0) stopSession(oldState.guild.id);
    });
}

export const gurlsCommand = createMusicCommand({ name: 'gurls', file: 'gurls.mp3' });
export const toulonCommand = createMusicCommand({ name: 'toulon', file: 'toulon.mp3' });
export const pirateCommand = createMusicCommand({ name: 'pirate', file: 'pirate.mp3' });
export const valkyriesCommand = createMusicCommand({ name: 'valkyries', file: 'valkyries.mp3' });