const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticky')
        .setDescription('Set a sticky message in the current channel')
        .addSubcommand(sub => sub
            .setName('set')
            .setDescription('Set a sticky message')
            .addStringOption(option => option
                .setName('message')
                .setDescription('The message content (use \\n for new lines)')
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove the sticky message from this channel'))
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('View the current sticky message')),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channelId = interaction.channelId;
        const guildId = interaction.guildId;
        
        // Check permissions (requires Manage Messages)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setDescription(`⌗ <a:dcr_icon:1501886032818475059> ﹒**You need Manage Messages permission!**﹒ <a:dcr_icon:1501886032818475059> ﹒﹒︵`)
                .setFooter({ text: `only mods can use sticky messages` });
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        
        // SET STICKY MESSAGE
        if (subcommand === 'set') {
            let messageContent = interaction.options.getString('message');
            
            // Replace literal \n with actual newlines
            messageContent = messageContent.replace(/\\n/g, '\n');
            
            // Send the sticky message
            const stickyEmbed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setDescription(messageContent);
            
            const sentMessage = await interaction.channel.send({ embeds: [stickyEmbed] });
            
            // Store in database
            await db.set(`sticky_${guildId}_${channelId}`, {
                messageId: sentMessage.id,
                content: messageContent,
                userId: interaction.user.id,
                username: interaction.user.username
            });
            
            const confirmEmbed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setDescription(`⌗﹒ <a:05_Clover:1505555784266940640> ﹒**Sticky message set!** ﹒︵\n\n<a:dcr_a1:1501886035402031115> ﹙✦﹚  **Message saved to <#${channelId}>** ﹒ <a:tumblr_91a792399801929b62e23ca8f:1508609247246549094>\n\n<a:dcr_h:1505324134861770883> ﹒**Use /sticky remove to delete it**  ◟  >`)
                .setFooter({ text: `stickied by ${interaction.user.username}` });
            
            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        }
        
        // REMOVE STICKY MESSAGE
        else if (subcommand === 'remove') {
            const sticky = await db.get(`sticky_${guildId}_${channelId}`);
            
            if (!sticky) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xffb7c5)
                    .setDescription(`⌗ <a:dcr_icon:1501886032818475059> ﹒**No sticky message found in this channel!**﹒ <a:dcr_icon:1501886032818475059> ﹒﹒︵`)
                    .setFooter({ text: `use /sticky set to create one first` });
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Delete the sticky message
            try {
                const channel = interaction.channel;
                const oldMessage = await channel.messages.fetch(sticky.messageId);
                await oldMessage.delete();
            } catch (error) {
                // Message might already be deleted
            }
            
            await db.delete(`sticky_${guildId}_${channelId}`);
            
            const removeEmbed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setDescription(`⌗﹒ <a:05_Clover:1505555784266940640> ﹒**Sticky message removed!** ﹒︵\n\n<a:dcr_a1:1501886035402031115> ﹙✦﹚  **Cleared from <#${channelId}>** ﹒ <a:tumblr_91a792399801929b62e23ca8f:1508609247246549094>\n\n<a:dcr_h:1505324134861770883> ﹒**You can set a new one anytime**  ◟  >`)
                .setFooter({ text: `removed by ${interaction.user.username}` });
            
            await interaction.reply({ embeds: [removeEmbed], ephemeral: true });
        }
        
        // VIEW STICKY MESSAGE
        else if (subcommand === 'view') {
            const sticky = await db.get(`sticky_${guildId}_${channelId}`);
            
            if (!sticky) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xffb7c5)
                    .setDescription(`⌗ <a:dcr_icon:1501886032818475059> ﹒**No sticky message in this channel!**﹒ <a:dcr_icon:1501886032818475059> ﹒﹒︵`)
                    .setFooter({ text: `use /sticky set to create one` });
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            const viewEmbed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setAuthor({ name: `Sticky Message`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(sticky.content)
                .setFooter({ text: `set by ${sticky.username}` });
            
            await interaction.reply({ embeds: [viewEmbed], ephemeral: true });
        }
    }
};
