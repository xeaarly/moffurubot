const { SlashCommandBuilder, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database-mongo.js');
const { showEmbedEditor } = require('../handlers/embedHandler.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and manage embeds (Mimu style)')
        .addSubcommand(sub => sub.setName('create').setDescription('Create a new embed').addStringOption(opt => opt.setName('name').setDescription('Embed name (no spaces, max 16 chars)').setRequired(true)))
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit an existing embed').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)))
        .addSubcommand(sub => sub.setName('send').setDescription('Send an embed to a channel').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addChannelOption(opt => opt.setName('channel').setDescription('Channel to send to').setRequired(false)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all saved embeds'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Delete an embed').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: 'Need Manage Messages permission!', ephemeral: true });
        }

        if (sub === 'create') {
            let embedName = interaction.options.getString('name').toLowerCase().replace(/\s/g, '_');
            
            if (embedName.length > 16) {
                return interaction.reply({ content: 'Embed name must be 16 characters or less!', ephemeral: true });
            }

            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (embeds[embedName]) {
                return interaction.reply({ content: `Embed "${embedName}" already exists!`, ephemeral: true });
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

        else if (sub === 'edit') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            
            if (!embeds[embedName]) {
                return interaction.reply({ content: `Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            await showEmbedEditor(interaction, embedName, guildId);
        }

        else if (sub === 'send') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const embedData = embeds[embedName];
            
            if (!embedData) {
                return interaction.reply({ content: `Embed "${embedName}" not found!`, ephemeral: true });
            }

            const { EmbedBuilder } = require('discord.js');
            const user = interaction.user;
            const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
            
            if (embedData.authorName) embed.setAuthor({ name: embedData.authorName.replace(/{user}/g, user.username), iconURL: embedData.authorIcon });
            if (embedData.title) embed.setTitle(embedData.title.replace(/{user}/g, user.username));
            if (embedData.description) embed.setDescription(embedData.description.replace(/{user}/g, user.username).replace(/{newline}/g, '\n'));
            if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
            if (embedData.image) embed.setImage(embedData.image);
            if (embedData.footerText) embed.setFooter({ text: embedData.footerText.replace(/{user}/g, user.username), iconURL: embedData.footerIcon });

            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: `Embed sent to ${channel}!`, ephemeral: true });
        }

        else if (sub === 'list') {
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const list = Object.keys(embeds);
            
            if (list.length === 0) {
                return interaction.reply({ content: 'No saved embeds! Use /embed create', ephemeral: true });
            }

            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setTitle('Saved Embeds')
                .setDescription(list.map((n, i) => `${i+1}. ${n}`).join('\n'));

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        else if (sub === 'delete') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            
            if (!embeds[embedName]) {
                return interaction.reply({ content: `Embed "${embedName}" not found!`, ephemeral: true });
            }
            
            delete embeds[embedName];
            await db.set(`saved_embeds_${guildId}`, embeds);
            await interaction.reply({ content: `Deleted "${embedName}"`, ephemeral: true });
        }
    }
};