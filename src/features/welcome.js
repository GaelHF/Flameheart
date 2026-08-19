import { EmbedBuilder, Events } from 'discord.js';
import { config } from '../config.js';
import { log } from '../log.js';

export function registerWelcome(client) {
    client.on(Events.GuildMemberAdd, async (member) => {
        if (member.guild.id !== config.guildId) return;

        try {
            await member.roles.add(config.roles.member);
        } catch (error) {
            log.error(`Impossible d'ajouter le rôle de membre à ${member.user.tag} :`, error);
        }

        const channel = member.guild.channels.cache.get(config.channels.welcome);
        if (!channel?.isTextBased()) {
            log.warn('Salon de bienvenue introuvable.');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle(`Bienvenue ${member.displayName} dans la RED SEA !`)
            .setImage(config.assets.welcomeBanner)
            .setTimestamp();

        try {
            const message = await channel.send({ embeds: [embed] });
            await message.react('👋');
            log.info(`👋 Nouveau membre : ${member.user.tag}`);
        } catch (error) {
            log.error('Échec du message de bienvenue :', error);
        }
    });
}
