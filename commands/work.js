const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Simple storage (we'll add database later)
const userData = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Create art and earn palette pieces'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const now = Date.now();
        const today = new Date().toDateString();
        
        if (!userData.has(userId)) {
            userData.set(userId, { wallet: 0, lastWork: 0, streak: 0, lastStreakDate: null });
        }
        
        const user = userData.get(userId);
        
        // 30 minute cooldown
        if (now - user.lastWork < 30 * 60 * 1000) {
            const minutesLeft = Math.ceil((30 * 60 * 1000 - (now - user.lastWork)) / 60000);
            const cooldownEmbed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setDescription(`﹒⌗ <a:dcr_icon:1501886032818475059> ﹒**You can work again in ${minutesLeft} minutes!**﹒ <a:dcr_icon:1501886032818475059> ﹒﹒︵ `)
                .setFooter({ text: `Take a break!` });
            return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
        }
        
        // Handle streak
        if (user.lastStreakDate === today) {
            // Already worked today, no streak increase
        } else if (user.lastStreakDate === null) {
            // First time working
            user.streak = 1;
            user.lastStreakDate = today;
        } else {
            // Check if yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toDateString();
            
            if (user.lastStreakDate === yesterdayString) {
                // Streak continues
                user.streak++;
                user.lastStreakDate = today;
            } else {
                // Streak broken
                user.streak = 1;
                user.lastStreakDate = today;
            }
        }
        
        // Calculate earnings with streak bonus
        let earnings = Math.floor(Math.random() * 250) + 50;
        const streakBonus = Math.floor(user.streak / 5) * 25; // Bonus every 5 days
        let bonusMessage = '';
        
        if (streakBonus > 0) {
            earnings += streakBonus;
            bonusMessage = `\n<a:dcr_h:1505324134861770883> ﹒**Streak bonus! +${streakBonus} pieces!**﹒ <a:dcr_h:1505324134861770883>`;
        }
        
        user.wallet += earnings;
        user.lastWork = now;
        
        const jobs = [
            { name: 'Watercolor Artist', emoji: '<a:tumblr_9591befccd5405a5596874a50:1508609087955402865>' },
            { name: 'Color Mixer', emoji: '<a:tumblr_91a792399801929b62e23ca8f:1508609247246549094>' },
            { name: 'Sketchbook Doodler', emoji: '<a:dcr_icon10:1491021234173907055>' },
            { name: 'Sketch Artist', emoji: '<a:05_Clover:1505555784266940640>' }
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        
// Create streak display with custom emojis
const streakDisplay = '<a:05_Clover:1505555784266940640>'.repeat(Math.min(user.streak, 5)) + (user.streak > 5 ? ` +${user.streak - 5}` : '');
        
        const workEmbed = new EmbedBuilder()
            .setColor(0xffb7c5)
            .setAuthor({ name: `${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
            .setDescription(`⌗﹒ ${job.emoji} ﹒**${job.name}**﹒ ${job.emoji} ﹒︵ \n<a:dcr_a1:1501886035402031115> ﹙✦﹚ **You earned \`${earnings}\` palette pieces!** ✦ ﹒ <a:dcr_a1:1501886035402031115>\n\n﹒ ♡﹒ **Streak: ${user.streak} day${user.streak !== 1 ? 's' : ''}** ${streakDisplay} ﹒${bonusMessage}`)
            .setFooter({ text: `keep working!.. i collect all your tax..` });
        
        await interaction.reply({ embeds: [workEmbed] });
        
        // Show new balance in a follow-up
        setTimeout(async () => {
            const balanceEmbed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setDescription(`<a:dcr_h:1505324134861770883> ﹒**Your palette now holds \`${user.wallet}\` pieces!**﹒ <a:dcr_h:1505324134861770883>`);
            await interaction.followUp({ embeds: [balanceEmbed] });
        }, 1500);
    }
};
