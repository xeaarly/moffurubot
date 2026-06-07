const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database-mongo.js');

async function showEmbedEditor(interaction, embedName, guildId) {
    console.log('[DEBUG] showEmbedEditor called for:', embedName);
    
    const embeds = await db.get(`saved_embeds_${guildId}`) || {};
    const embedData = embeds[embedName] || {};
    const user = interaction.user;

    // Parse placeholders for preview
    let authorName = embedData.authorName || '';
    let authorIcon = embedData.authorIcon || '';
    let title = embedData.title || '';
    let description = embedData.description || '';
    let footerText = embedData.footerText || '';
    let footerIcon = embedData.footerIcon || '';
    
    // Replace placeholders for display
    authorName = authorName.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username).replace(/{user_tag}/g, user.username);
    title = title.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username).replace(/{user_tag}/g, user.username);
    description = description.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username).replace(/{user_tag}/g, user.username).replace(/{newline}/g, '\n');
    footerText = footerText.replace(/{user}/g, user.username).replace(/{user_name}/g, user.username).replace(/{user_tag}/g, user.username);
    
    // For preview, show placeholder text instead of actual URLs
    if (authorIcon === '{user_avatar}' || authorIcon === '{user_icon}') authorIcon = '[User Avatar]';
    if (footerIcon === '{user_avatar}' || footerIcon === '{user_icon}') footerIcon = '[User Avatar]';

    const preview = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
    if (authorName) preview.setAuthor({ name: authorName, iconURL: authorIcon || null });
    if (title) preview.setTitle(title);
    if (description) preview.setDescription(description);
    if (embedData.thumbnail && embedData.thumbnail !== '{user_avatar}' && embedData.thumbnail !== '{user_icon}') preview.setThumbnail(embedData.thumbnail);
    if (embedData.image && embedData.image !== '{user_avatar}' && embedData.image !== '{user_icon}') preview.setImage(embedData.image);
    if (footerText) preview.setFooter({ text: footerText, iconURL: footerIcon || null });

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`embed_basic_${embedName}`).setLabel('Basic Info').setStyle(ButtonStyle.Primary).setEmoji('✏️'),
            new ButtonBuilder().setCustomId(`embed_author_${embedName}`).setLabel('Author').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
            new ButtonBuilder().setCustomId(`embed_footer_${embedName}`).setLabel('Footer').setStyle(ButtonStyle.Secondary).setEmoji('📎')
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`embed_images_${embedName}`).setLabel('Images').setStyle(ButtonStyle.Secondary).setEmoji('🖼️'),
            new ButtonBuilder().setCustomId(`embed_done_${embedName}`).setLabel('Save').setStyle(ButtonStyle.Success).setEmoji('✅')
        );

    await interaction.reply({ 
        content: `Editing: ${embedName}`, 
        embeds: [preview], 
        components: [row1, row2], 
        ephemeral: true 
    });
    
    console.log('[DEBUG] showEmbedEditor completed');
}

async function handleEmbedButtons(interaction) {
    console.log('[DEBUG] Button received:', interaction.customId);
    
    if (!interaction.customId.startsWith('embed_')) return;
    
    const parts = interaction.customId.split('_');
    const action = parts[0] + '_' + parts[1];
    const embedName = parts.slice(2).join('_');
    const guildId = interaction.guildId;
    
    console.log('[DEBUG] Action:', action, 'EmbedName:', embedName);
    
    if (action === 'embed_done') {
        await interaction.update({ content: `Embed "${embedName}" saved!`, components: [], embeds: [] });
        return;
    }
    
    const embeds = await db.get(`saved_embeds_${guildId}`) || {};
    const embedData = embeds[embedName] || {};
    
    if (action === 'embed_basic') {
        const modal = new ModalBuilder().setCustomId(`modal_basic_${embedName}`).setTitle(`Edit: ${embedName}`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setValue(embedData.title || '').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description (use {newline})').setValue(embedData.description || '').setStyle(TextInputStyle.Paragraph).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Color (#ffb7c5)').setValue(embedData.color ? '#' + embedData.color.toString(16).padStart(6, '0') : '#ffb7c5').setStyle(TextInputStyle.Short).setRequired(false))
        );
        await interaction.showModal(modal);
    }
    
    if (action === 'embed_author') {
        const modal = new ModalBuilder().setCustomId(`modal_author_${embedName}`).setTitle(`Edit Author: ${embedName}`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('author_name').setLabel('Author Name').setValue(embedData.authorName || '').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('author_icon').setLabel('Author Icon URL (or {user_avatar})').setValue(embedData.authorIcon || '').setStyle(TextInputStyle.Short).setRequired(false))
        );
        await interaction.showModal(modal);
    }
    
    if (action === 'embed_footer') {
        const modal = new ModalBuilder().setCustomId(`modal_footer_${embedName}`).setTitle(`Edit Footer: ${embedName}`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('footer_text').setLabel('Footer Text').setValue(embedData.footerText || '').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('footer_icon').setLabel('Footer Icon URL (or {user_avatar})').setValue(embedData.footerIcon || '').setStyle(TextInputStyle.Short).setRequired(false))
        );
        await interaction.showModal(modal);
    }
    
    if (action === 'embed_images') {
        const modal = new ModalBuilder().setCustomId(`modal_images_${embedName}`).setTitle(`Edit Images: ${embedName}`);
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('thumbnail').setLabel('Thumbnail URL (or {user_avatar})').setValue(embedData.thumbnail || '').setStyle(TextInputStyle.Short).setRequired(false)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('Main Image URL (or {user_avatar})').setValue(embedData.image || '').setStyle(TextInputStyle.Short).setRequired(false))
        );
        await interaction.showModal(modal);
    }
}

async function handleEmbedModals(interaction) {
    console.log('[DEBUG] ===== MODAL SUBMITTED =====');
    console.log('[DEBUG] Modal CustomId:', interaction.customId);
    
    if (interaction.customId.startsWith('modal_basic_')) {
        const embedName = interaction.customId.replace('modal_basic_', '');
        const guildId = interaction.guildId;
        
        const title = interaction.fields.getTextInputValue('title');
        let description = interaction.fields.getTextInputValue('description');
        let color = interaction.fields.getTextInputValue('color');
        
        description = description.replace(/{newline}/g, '\n');
        
        let embedColor = 0xffb7c5;
        if (color && color.startsWith('#')) {
            embedColor = parseInt(color.slice(1), 16) || 0xffb7c5;
        }
        
        let embeds = await db.get(`saved_embeds_${guildId}`) || {};
        if (!embeds[embedName]) embeds[embedName] = {};
        
        embeds[embedName].title = title || null;
        embeds[embedName].description = description || null;
        embeds[embedName].color = embedColor;
        
        await db.set(`saved_embeds_${guildId}`, embeds);
        await showEmbedEditor(interaction, embedName, guildId);
    }
    
    if (interaction.customId.startsWith('modal_author_')) {
        const embedName = interaction.customId.replace('modal_author_', '');
        const guildId = interaction.guildId;
        
        const authorName = interaction.fields.getTextInputValue('author_name');
        const authorIcon = interaction.fields.getTextInputValue('author_icon');
        
        let embeds = await db.get(`saved_embeds_${guildId}`) || {};
        if (!embeds[embedName]) embeds[embedName] = {};
        
        embeds[embedName].authorName = authorName || null;
        embeds[embedName].authorIcon = authorIcon || null;
        
        await db.set(`saved_embeds_${guildId}`, embeds);
        await showEmbedEditor(interaction, embedName, guildId);
    }
    
    if (interaction.customId.startsWith('modal_footer_')) {
        const embedName = interaction.customId.replace('modal_footer_', '');
        const guildId = interaction.guildId;
        
        const footerText = interaction.fields.getTextInputValue('footer_text');
        const footerIcon = interaction.fields.getTextInputValue('footer_icon');
        
        let embeds = await db.get(`saved_embeds_${guildId}`) || {};
        if (!embeds[embedName]) embeds[embedName] = {};
        
        embeds[embedName].footerText = footerText || null;
        embeds[embedName].footerIcon = footerIcon || null;
        
        await db.set(`saved_embeds_${guildId}`, embeds);
        await showEmbedEditor(interaction, embedName, guildId);
    }
    
    if (interaction.customId.startsWith('modal_images_')) {
        const embedName = interaction.customId.replace('modal_images_', '');
        const guildId = interaction.guildId;
        
        const thumbnail = interaction.fields.getTextInputValue('thumbnail');
        const image = interaction.fields.getTextInputValue('image');
        
        let embeds = await db.get(`saved_embeds_${guildId}`) || {};
        if (!embeds[embedName]) embeds[embedName] = {};
        
        embeds[embedName].thumbnail = thumbnail || null;
        embeds[embedName].image = image || null;
        
        await db.set(`saved_embeds_${guildId}`, embeds);
        await showEmbedEditor(interaction, embedName, guildId);
    }
}

module.exports = { handleEmbedButtons, handleEmbedModals, showEmbedEditor };