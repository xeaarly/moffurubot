const { SlashCommandBuilder } = require('discord.js');

// Simple storage (we'll add database later)
const userData = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Create art and earn palette pieces'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const now = Date.now();
        
        if (!userData.has(userId)) {
            userData.set(userId, { wallet: 0, lastWork: 0 });
        }
        
        const user = userData.get(userId);
        
        // 30 minute cooldown
        if (now - user.lastWork < 30 * 60 * 1000) {
            const minutesLeft = Math.ceil((30 * 60 * 1000 - (now - user.lastWork)) / 60000);
            return interaction.reply({ content: ` You can work again in ${minutesLeft} minutes!`, ephemeral: true });
        }
        
        const earnings = Math.floor(Math.random() * 250) + 50;
        user.wallet += earnings;
        user.lastWork = now;
        
        const jobs = [' Watercolor Artist', ' Paintbrush Wielder', ' Sketchbook Doodler', ' Flower Painter'];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        
        await interaction.reply(`${job}\n> You earned **${earnings}** palette pieces!`);
    }
};
