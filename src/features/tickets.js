import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits
} from 'discord.js';
import { config } from '../config.js';
import { log } from '../log.js';

export const OPEN_TICKET_ID = 'create_ticket';
export const CLOSE_TICKET_ID = 'close_ticket';
const TICKET_PREFIX = 'ticket-';
const CLOSE_DELAY_MS = 5_000;

/** Le panneau posté dans un salon public, d'où les membres ouvrent un ticket. */
export function ticketPanel() {
    const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('Tickets 🎫')
        .setDescription(
            "Vous avez un problème, un signalement à faire ou vous voulez simplement contacter l'équipe de la RED SEA ? Ouvrez un ticket !"
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(OPEN_TICKET_ID)
            .setLabel('Ouvrir un ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row] };
}

async function openTicket(interaction) {
    const { guild, user } = interaction;
    const name = `${TICKET_PREFIX}${user.id}`;

    const existing = guild.channels.cache.find((channel) => channel.name === name);
    if (existing) {
        return interaction.reply({
            content: `Vous avez déjà un ticket ouvert : ${existing}. Fermez-le avant d'en ouvrir un nouveau.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: config.channels.ticketsCategory,
        topic: `Ticket de ${user.tag} (${user.id})`,
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
                id: user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            },
            {
                id: config.roles.staff,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            }
        ]
    });

    const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('🎫 Ticket')
        .setDescription(
            "Ahoy ! Merci d'avoir ouvert un ticket. Un membre de notre équipe vous répondra dans les plus brefs délais."
        )
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(CLOSE_TICKET_ID)
            .setLabel('Fermer le ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `${user} <@&${config.roles.staff}>`, embeds: [embed], components: [row] });
    await interaction.editReply({ content: `Ton ticket a été créé : ${channel}` });
    log.info(`🎫 Ticket créé par ${user.tag}`);
}

async function closeTicket(interaction) {
    if (!interaction.channel.name.startsWith(TICKET_PREFIX)) {
        return interaction.reply({
            content: 'Ce bouton ne peut être utilisé que dans un salon de ticket.',
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.reply({ content: '🔒 Ce ticket sera fermé dans 5 secondes...' });
    log.info(`🎫 Ticket fermé par ${interaction.user.tag} : ${interaction.channel.name}`);

    setTimeout(() => {
        interaction.channel.delete('Ticket fermé').catch((error) => log.error('Fermeture du ticket :', error));
    }, CLOSE_DELAY_MS);
}

/** Routeur des boutons de ticket. Renvoie true si l'interaction a été traitée. */
export async function handleTicketButton(interaction) {
    if (interaction.customId === OPEN_TICKET_ID) {
        await openTicket(interaction);
        return true;
    }

    if (interaction.customId === CLOSE_TICKET_ID) {
        await closeTicket(interaction);
        return true;
    }

    return false;
}
