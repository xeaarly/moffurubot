const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../database-mongo.js');
const { showEmbedEditor } = require('../handlers/embedHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and manage custom embeds')
        // Main commands
        .addSubcommand(sub => sub.setName('create').setDescription('Create a new embed').addStringOption(opt => opt.setName('name').setDescription('Embed name (no spaces, max 16 chars)').setRequired(true)))
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit an existing embed').addStringOption(opt => opt.setName('name').setDescription('Embed name (leave empty to select from list)').setRequired(false)))
        .addSubcommand(sub => sub.setName('send').setDescription('Send an embed to a channel').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addChannelOption(opt => opt.setName('channel').setDescription('Channel to send to').setRequired(false)))
        .addSubcommand(sub => sub.setName('show').setDescription('Preview an embed').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all saved embeds'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Delete an embed').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)))
        // Individual property edits
        .addSubcommand(sub => sub.setName('author').setDescription('Edit embed author').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addStringOption(opt => opt.setName('text').setDescription('Author text').setRequired(false)).addStringOption(opt => opt.setName('icon').setDescription('Author icon URL').setRequired(false)))
        .addSubcommand(sub => sub.setName('title').setDescription('Edit embed title').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addStringOption(opt => opt.setName('text').setDescription('Title text').setRequired(false)))
        .addSubcommand(sub => sub.setName('description').setDescription('Edit embed description').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addStringOption(opt => opt.setName('text').setDescription('Description text').setRequired(false)))
        .addSubcommand(sub => sub.setName('color').setDescription('Edit embed color').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addStringOption(opt => opt.setName('color').setDescription('Hex color code').setRequired(false)))
        .addSubcommand(sub => sub.setName('thumbnail').setDescription('Edit embed thumbnail').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addStringOption(opt => opt.setName('image').setDescription('Image URL').setRequired(false)))
        .addSubcommand(sub => sub.setName('image').setDescription('Edit embed image').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addStringOption(opt => opt.setName('image').setDescription('Image URL').setRequired(false)))
        .addSubcommand(sub => sub.setName('footer').setDescription('Edit embed footer').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addStringOption(opt => opt.setName('text').setDescription('Footer text').setRequired(false)).addStringOption(opt => opt.setName('icon').setDescription('Footer icon URL').setRequired(false)))
        .addSubcommand(sub => sub.setName('timestamp').setDescription('Add or remove timestamp').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addBooleanOption(opt => opt.setName('enabled').setDescription('True to add, False to remove').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ You need Manage Messages permission!', ephemeral: true });
        }

        // ========== CREATE EMBED ==========
        if (sub === 'create') {
            let embedName = interaction.options.getString('name').toLowerCase().replace(/\s/g, '_');
            
            if (embedName.length > 16) {
                return interaction.reply({ content: '❌ Embed name must be 16 characters or less!', ephemeral: true });
            }

            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" already exists!`, ephemeral: true });
            }

            embeds[embedName] = { name: embedName, color: 0xffb7c5, createdAt: Date.now(), createdBy: interaction.user.id };
            await db.set(`saved_embeds_${guildId}`, embeds);

            const modal = new ModalBuilder()
                .setCustomId(`modal_basic_${embedName}`)
                .setTitle(`Create Embed: ${embedName}`);

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setPlaceholder('Your embed title').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description (use {newline})').setPlaceholder('Your embed description').setStyle(TextInputStyle.Paragraph).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Color (hex)').setPlaceholder('#ffb7c5').setStyle(TextInputStyle.Short).setRequired(false))
            );

            await interaction.showModal(modal);
        }

        // ========== EDIT EMBED (with dropdown selector) ==========
        else if (sub === 'edit') {
            const embedName = interaction.options.getString('name');
            
            // If name provided, edit directly
            if (embedName) {
                const embeds = await db.get(`saved_embeds_${guildId}`) || {};
                if (!embeds[embedName]) {
                    return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
                }
                await showEmbedEditor(interaction, embedName, guildId);
                return;
            }
            
            // Otherwise, show dropdown of all embeds
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const embedList = Object.keys(embeds);
            
            if (embedList.length === 0) {
                return interaction.reply({ content: '📭 No embeds found! Create one with `/embed create`', ephemeral: true });
            }
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('embed_select_edit')
                .setPlaceholder('Select an embed to edit')
                .addOptions(
                    embedList.map(embed => new StringSelectMenuOptionBuilder()
                        .setLabel(embed)
                        .setDescription(`Edit ${embed}`)
                        .setValue(embed))
                );
            
            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            await interaction.reply({
                content: '📦 Select which embed you want to edit:',
                components: [row],
                ephemeral: true
            });
        }

        // ========== SEND EMBED ==========
        else if (sub === 'send') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const embedData = embeds[embedName];
            
            if (!embedData) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }

            const user = interaction.user;
            const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
            
            if (embedData.authorName) embed.setAuthor({ name: embedData.authorName.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username), iconURL: embedData.authorIcon ? embedData.authorIcon.replace(/{user_avatar}/g, user.displayAvatarURL()) : null });
            if (embedData.title) embed.setTitle(embedData.title.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username));
            if (embedData.description) embed.setDescription(embedData.description.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username).replace(/{newline}/g, '\n'));
            if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail.replace(/{user_avatar}/g, user.displayAvatarURL()));
            if (embedData.image) embed.setImage(embedData.image.replace(/{user_avatar}/g, user.displayAvatarURL()));
            if (embedData.footerText) embed.setFooter({ text: embedData.footerText.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username), iconURL: embedData.footerIcon ? embedData.footerIcon.replace(/{user_avatar}/g, user.displayAvatarURL()) : null });
            if (embedData.timestamp) embed.setTimestamp();

            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: `✅ Embed sent to ${channel}!`, ephemeral: true });
        }

        // ========== SHOW PREVIEW ==========
        else if (sub === 'show') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const embedData = embeds[embedName];
            
            if (!embedData) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }

            const user = interaction.user;
            const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
            
            if (embedData.authorName) embed.setAuthor({ name: embedData.authorName.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username), iconURL: embedData.authorIcon ? embedData.authorIcon.replace(/{user_avatar}/g, user.displayAvatarURL()) : null });
            if (embedData.title) embed.setTitle(embedData.title.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username));
            if (embedData.description) embed.setDescription(embedData.description.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username).replace(/{newline}/g, '\n'));
            if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail.replace(/{user_avatar}/g, user.displayAvatarURL()));
            if (embedData.image) embed.setImage(embedData.image.replace(/{user_avatar}/g, user.displayAvatarURL()));
            if (embedData.footerText) embed.setFooter({ text: embedData.footerText.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username), iconURL: embedData.footerIcon ? embedData.footerIcon.replace(/{user_avatar}/g, user.displayAvatarURL()) : null });
            if (embedData.timestamp) embed.setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ========== LIST EMBEDS ==========
        else if (sub === 'list') {
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const list = Object.keys(embeds);
            
            if (list.length === 0) {
                return interaction.reply({ content: '📭 No saved embeds! Use `/embed create` to make one.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setTitle(`📦 Saved Embeds (${list.length}/5)`)
                .setDescription(list.map((n, i) => `${i+1}. \`${n}\``).join('\n'))
                .setFooter({ text: 'Use `/embed edit` to modify' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ========== DELETE EMBED ==========
        else if (sub === 'delete') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            delete embeds[embedName];
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Embed "${embedName}" deleted!`, ephemeral: true });
        }

        // ========== EDIT AUTHOR ==========
        else if (sub === 'author') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const text = interaction.options.getString('text');
            const icon = interaction.options.getString('icon');
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            embeds[embedName].authorName = text || null;
            embeds[embedName].authorIcon = icon || null;
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Author updated for "${embedName}"!`, ephemeral: true });
        }

        // ========== EDIT TITLE ==========
        else if (sub === 'title') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const text = interaction.options.getString('text');
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            embeds[embedName].title = text || null;
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Title updated for "${embedName}"!`, ephemeral: true });
        }

        // ========== EDIT DESCRIPTION ==========
        else if (sub === 'description') {
            const embedName = interaction.options.getString('name').toLowerCase();
            let text = interaction.options.getString('text');
            
            if (text) text = text.replace(/{newline}/g, '\n');
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            embeds[embedName].description = text || null;
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Description updated for "${embedName}"!`, ephemeral: true });
        }

        // ========== EDIT COLOR ==========
        else if (sub === 'color') {
            const embedName = interaction.options.getString('name').toLowerCase();
            let color = interaction.options.getString('color');
            
            let embedColor = 0xffb7c5;
            if (color && color.startsWith('#')) {
                embedColor = parseInt(color.slice(1), 16) || 0xffb7c5;
            }
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            embeds[embedName].color = embedColor;
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Color updated for "${embedName}"!`, ephemeral: true });
        }

        // ========== EDIT THUMBNAIL ==========
        else if (sub === 'thumbnail') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const image = interaction.options.getString('image');
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            embeds[embedName].thumbnail = image || null;
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Thumbnail updated for "${embedName}"!`, ephemeral: true });
        }

        // ========== EDIT IMAGE ==========
        else if (sub === 'image') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const image = interaction.options.getString('image');
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            embeds[embedName].image = image || null;
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Image updated for "${embedName}"!`, ephemeral: true });
        }

        // ========== EDIT FOOTER ==========
        else if (sub === 'footer') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const text = interaction.options.getString('text');
            const icon = interaction.options.getString('icon');
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            embeds[embedName].footerText = text || null;
            embeds[embedName].footerIcon = icon || null;
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Footer updated for "${embedName}"!`, ephemeral: true });
        }

        // ========== EDIT TIMESTAMP ==========
        else if (sub === 'timestamp') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const enabled = interaction.options.getBoolean('enabled');
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (!embeds[embedName]) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            embeds[embedName].timestamp = enabled;
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `✅ Timestamp ${enabled ? 'added to' : 'removed from'} "${embedName}"!`, ephemeral: true });
        }
    }
};