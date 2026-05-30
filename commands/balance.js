const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const userData = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your palette pieces')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('User to check')
                .setRequired(false)),
    
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const userId = target.id;
        
        const user = userData.get(userId) || { wallet: 0 };
        
        const balanceEmbed = new EmbedBuilder()
            .setColor(0xffb7c5)
            .setAuthor({ name: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setDescription(`⌗﹒ <a:05_Clover:1505555784266940640> ﹒**${target.username}'s Palette** ﹒︵  \n\n<a:dcr_a1:1501886035402031115> ﹙✦﹚  **\`${user.wallet}\` palette pieces!** ﹒ <a:tumblr_91a792399801929b62e23ca8f:1508609247246549094>  \n\n<a:dcr_h:1505324134861770883> ﹒**Keep creating!**  ◟  >`)
            .setFooter({ text: `every brush stroke counts` });
        
        await interaction.reply({ embeds: [balanceEmbed] });
    }
};
