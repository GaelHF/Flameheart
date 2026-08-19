import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} from 'discord.js';
import { config } from './config.js';
import { ticketPanel } from './features/tickets.js';
import { gurlsCommand, pirateCommand, toulonCommand, valkyriesCommand } from './music.js';

const RULES = [
    {
        title: 'Respect entre les joueurs',
        text: 'Toutes les insultes, menaces, provocations ou discriminations seront lourdement sanctionnées.'
    },
    {
        title: "Les tricheurs ne sont pas de vrais pirates",
        text: "Tous ceux qui utilisent des logiciels de triche ou qui abusent d'erreurs du jeu Sea of Thieves seront bannis de ce serveur. Soyez des pirates respectables."
    },
    {
        title: "La publicité n'est pas tolérée",
        text: `Les liens de vidéos, de chaînes ou d'invitations externes sont interdits. Si vous souhaitez proposer quelque chose, ouvrez un ticket (<#${config.channels.ticketsInfo}>).`
    },
    {
        title: 'Comportement de pirate',
        text: "Il est interdit de rejoindre un équipage simplement pour nuire aux membres d'un navire : cacher des trésors, brûler le navire, etc."
    }
];

const rulesMessage = () => {
    const embed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('Règlement de la RED SEA')
        .setDescription(
            [
                "Nous sommes des pirates, mais il faut garder de l'ordre.",
                "L'infraction d'une règle vous donne un avertissement ; au troisième, un bannissement permanent est appliqué.",
                '',
                'Le bannissement peut être immédiat, sans avertissement, selon le contexte.',
                "Ces règles s'appliquent à tout le monde, modérateurs et équipe compris.",
                '',
                RULES.map((rule) => `- **${rule.title}**\n> ${rule.text}`).join('\n')
            ].join('\n')
        )
        .setImage(config.assets.rulesBanner);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Sea of Thieves — Code de conduite')
            .setStyle(ButtonStyle.Link)
            .setURL(
                'https://support.seaofthieves.com/hc/fr/articles/360015285919-Le-Code-des-pirates-de-Sea-of-Thieves-et-le-Code-de-conduite-de-la-communauté'
            )
    );

    return { embeds: [embed], components: [row] };
};

/** Chaque commande : sa définition + son exécution. */
export const commands = new Map(
    [
        {
            data: new SlashCommandBuilder()
                .setName('reglement')
                .setDescription('Publie le règlement du serveur dans ce salon.')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
            async execute(interaction) {
                await interaction.channel.send(rulesMessage());
                await interaction.reply({ content: '✅ Règlement publié.', flags: MessageFlags.Ephemeral });
            }
        },
        {
            data: new SlashCommandBuilder()
                .setName('tickets')
                .setDescription("Publie le panneau d'ouverture de tickets dans ce salon.")
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
            async execute(interaction) {
                await interaction.channel.send(ticketPanel());
                await interaction.reply({ content: '✅ Panneau de tickets publié.', flags: MessageFlags.Ephemeral });
            }
        },
        gurlsCommand,
        toulonCommand,
        pirateCommand,
        valkyriesCommand
    ].map((command) => [command.data.name, command])
);

export const commandsPayload = () => [...commands.values()].map((command) => command.data.toJSON());
