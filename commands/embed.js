const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const db = require('../database-mongo.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and manage embeds')
        .addSubcommand(sub => sub.setName('create').setDescription('Create embed').addStringOption(opt => opt.setName('name').setDescription('Name').setRequired(true)))
        .addSubcommand(sub => sub.setName('send').setDescription('Send embed').addStringOption(opt => opt.setName('name').setDescription('Name').setRequired(true)).addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(false)))
        .addSubcommand(sub => sub.setName('list').setDescription('List embeds'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Delete embed').addStringOption(opt => opt.setName('name').setDescription('Name').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: 'Need Manage Messages permission!', ephemeral: true });
        }

        if (sub === 'create') {
            const embedName = interaction.options.getString('name').toLowerCase().replace(/\s/g, '_');
            
            let embeds = await db.get(`saved_embeds_${guildId}`) || {};
            if (embeds[embedName]) {
                return interaction.reply({ content: `Embed "${embedName}" already exists!`, ephemeral: true });
            }

            embeds[embedName] = { name: embedName, color: 0xffb7c5, createdAt: Date.now(), createdBy: interaction.user.id };
            await db.set(`saved_embeds_${guildId}`, embeds);

            const modal = new ModalBuilder()
                .setCustomId(`embed_modal_${embedName}`)
                .setTitle(`Create Embed: ${embedName}`);

            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setStyle(TextInputStyle.Short).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(false)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Color (#ffb7c5)').setStyle(TextInputStyle.Short).setRequired(false))
            );

            await interaction.showModal(modal);
        }

        else if (sub === 'send') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const embedData = embeds[embedName];
            
            if (!embedData) {
                return interaction.reply({ content: `Embed "${embedName}" not found!`, ephemeral: true });
            }

            let color = 0xffb7c5;
            if (embedData.color) color = embedData.color;
            
            const embed = new EmbedBuilder().setColor(color);
            if (embedData.title) embed.setTitle(embedData.title);
            if (embedData.description) embed.setDescription(embedData.description);

            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: `Embed sent to ${channel}!`, ephemeral: true });
        }

        else if (sub === 'list') {
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const list = Object.keys(embeds);
            
            if (list.length === 0) {
                return interaction.reply({ content: 'No saved embeds! Use /embed create', ephemeral: true });
            }

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