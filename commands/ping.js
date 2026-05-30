const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ embeds: [loadingEmbed()], fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        const pingEmbed = new EmbedBuilder()
            .setColor(0xffb7c5)
            .setAuthor({ name: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setDescription(`⌗ <a:dcr_icon:1501886032818475059> ﹒**Pong!**﹒ <a:dcr_icon:1501886032818475059> \n\n︶︶ ﹒✦  **Bot Latency:** \`${latency}ms\` \n\n♡﹒ ﹒︵ **API Latency:** \`${apiLatency}ms\``)
            .setFooter({ text: `watercolor dreams • brush strokes` });
        
        await interaction.editReply({ embeds: [pingEmbed] });
        
        function loadingEmbed() {
            return new EmbedBuilder()
                .setColor(0xffb7c5)
                .setDescription(` ♡﹒ <a:dcr_icon:1501886032818475059> ﹒**Measuring ping...**﹒ <a:dcr_icon:1501886032818475059> ﹒`);
        }
    }
};
