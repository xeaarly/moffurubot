const { SlashCommandBuilder } = require('discord.js');

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
        
        if (now - user.lastDaily < 24 * 60 * 60 * 1000) {
            const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - (now - user.lastDaily)) / 3600000);
            return interaction.reply({ content: `⏰ You can claim daily in ${hoursLeft} hours!`, ephemeral: true });
        }
        
        const reward = 500;
        user.wallet += reward;
        user.lastDaily = now;
        
        await interaction.reply(`🌸 Daily reward claimed!\n> +**${reward}** palette pieces!`);
    }
};
