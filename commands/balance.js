const { SlashCommandBuilder } = require('discord.js');

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
        
        await interaction.reply(`🎨 **${target.username}** has **${user.wallet}** palette pieces!`);
    }
};
