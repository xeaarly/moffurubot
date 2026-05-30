const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const userData = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily palette pieces'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const now = Date.now();
        
        if (!userData.has(userId)) {
            userData.set(userId, { wallet: 0, lastDaily: 0 });
        }
        
        const user = userData.get(userId);
        
        // 24 hour cooldown
        if (now - user.lastDaily < 24 * 60 * 60 * 1000) {
            const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now - user.lastDaily)) / 3600000);
            const cooldownEmbed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setDescription(`⌗ <a:dcr_icon:1501886032818475059> ﹒**You can claim daily in ${hoursLeft} hours!**﹒ <a:dcr_icon:1501886032818475059> ﹒﹒︵`)
                .setFooter({ text: `Come back tomorrow!` });
            return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
        
        const reward = 500;
        user.wallet += reward;
        user.lastDaily = now;
        
        const dailyEmbed = new EmbedBuilder()
            .setColor(0xffb7c5)
            .setAuthor({ name: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setDescription(`⌗﹒ <a:05_Clover:1505555784266940640> ﹒**Daily Reward Claimed!** ﹒︵  \n\n<a:dcr_a1:1501886035402031115> ﹙✦﹚  **+${reward} palette pieces!** ﹒ <a:tumblr_91a792399801929b62e23ca8f:1508609247246549094>  \n\n<a:dcr_h:1505324134861770883> ﹒**Your palette now holds \`${user.wallet}\` pieces!**  ◟  >`)
            .setFooter({ text: `see you again tomorrow!` });
        
        await interaction.reply({ embeds: [dailyEmbed] });
    }
};
