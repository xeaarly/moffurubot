const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../database-mongo.js');
const { showEmbedEditor } = require('../handlers/embedHandler.js');

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Helper function to format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Helper function to replace all placeholders
async function replacePlaceholders(text, interaction, targetChannel) {
    if (!text) return text;
    
    const user = interaction.user;
    const guild = interaction.guild;
    const channel = targetChannel || interaction.channel;
    
    let result = text;
    
    // ========== USER / AUTHOR INFORMATION ==========
    result = result.replace(/{user}/g, `<@${user.id}>`);
    result = result.replace(/{user_tag}/g, user.tag || user.username);
    result = result.replace(/{user_name}/g, user.username);
    result = result.replace(/{user_avatar}/g, user.displayAvatarURL());
    result = result.replace(/{user_discrim}/g, user.discriminator || '0');
    result = result.replace(/{user_id}/g, user.id);
    
    // User nickname
    let nickname = user.username;
    if (guild && guild.members.cache.get(user.id)) {
        const member = guild.members.cache.get(user.id);
        nickname = member.nickname || user.username;
    }
    result = result.replace(/{user_nick}/g, nickname);
    
    // User join date
    if (guild && guild.members.cache.get(user.id)) {
        const member = guild.members.cache.get(user.id);
        result = result.replace(/{user_joindate}/g, member.joinedAt ? member.joinedAt.toDateString() : 'Unknown');
    } else {
        result = result.replace(/{user_joindate}/g, 'Unknown');
    }
    
    // User create date
    result = result.replace(/{user_createdate}/g, user.createdAt.toDateString());
    
    // User display color (hex)
    let displayColor = '#ffffff';
    if (guild && guild.members.cache.get(user.id)) {
        const member = guild.members.cache.get(user.id);
        if (member.displayHexColor && member.displayHexColor !== '#000000') {
            displayColor = member.displayHexColor;
        }
    }
    result = result.replace(/{user_displaycolor}/g, displayColor);
    
    // User boost since
    let boostSince = 'Not a Booster';
    if (guild && guild.members.cache.get(user.id)) {
        const member = guild.members.cache.get(user.id);
        if (member.premiumSince) {
            boostSince = member.premiumSince.toDateString();
        }
    }
    result = result.replace(/{user_boostsince}/g, boostSince);
    
    // User balance (from database)
    const userBalance = await db.get(`user_${user.id}`) || { wallet: 0 };
    result = result.replace(/{user_balance}/g, userBalance.wallet.toString());
    result = result.replace(/{user_balance_locale}/g, formatNumber(userBalance.wallet));
    
    // ========== SERVER GENERAL INFORMATION ==========
    if (guild) {
        result = result.replace(/{server_name}/g, guild.name);
        result = result.replace(/{server_id}/g, guild.id);
        result = result.replace(/{server_membercount}/g, guild.memberCount.toString());
        result = result.replace(/{server_membercount_ordinal}/g, getOrdinal(guild.memberCount));
        
        // Member count without bots
        const memberCountNoBots = guild.members.cache.filter(m => !m.user.bot).size;
        result = result.replace(/{server_membercount_nobots}/g, memberCountNoBots.toString());
        result = result.replace(/{server_membercount_nobots_ordinal}/g, getOrdinal(memberCountNoBots));
        
        // Bot count
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        result = result.replace(/{server_botcount}/g, botCount.toString());
        result = result.replace(/{server_botcount_ordinal}/g, getOrdinal(botCount));
        
        // Server icon
        result = result.replace(/{server_icon}/g, guild.iconURL() || '');
        
        // Role count
        result = result.replace(/{server_rolecount}/g, guild.roles.cache.size.toString());
        
        // Channel count
        result = result.replace(/{server_channelcount}/g, guild.channels.cache.size.toString());
        
        // Random member
        const members = guild.members.cache.filter(m => !m.user.bot);
        const randomMember = members.random();
        if (randomMember) {
            result = result.replace(/{server_randommember}/g, `<@${randomMember.id}>`);
            result = result.replace(/{server_randommember_tag}/g, randomMember.user.tag);
            const randomMemberNoBots = guild.members.cache.filter(m => !m.user.bot).random();
            result = result.replace(/{server_randommember_nobots}/g, randomMemberNoBots ? `<@${randomMemberNoBots.id}>` : 'No members');
        } else {
            result = result.replace(/{server_randommember}/g, 'No members');
            result = result.replace(/{server_randommember_tag}/g, 'No members');
            result = result.replace(/{server_randommember_nobots}/g, 'No members');
        }
        
        // Server owner
        const owner = await guild.fetchOwner().catch(() => null);
        result = result.replace(/{server_owner}/g, owner ? `<@${owner.id}>` : 'Unknown');
        result = result.replace(/{server_owner_id}/g, guild.ownerId || 'Unknown');
        
        // Server create date
        result = result.replace(/{server_createdate}/g, guild.createdAt.toDateString());
        
        // ========== SERVER BOOST INFORMATION ==========
        const boostLevel = guild.premiumTier || 0;
        result = result.replace(/{server_boostlevel}/g, boostLevel.toString());
        result = result.replace(/{server_boostcount}/g, guild.premiumSubscriptionCount || '0');
        
        let nextBoostLevel = boostLevel + 1;
        let requiredBoosts = 0;
        let untilRequired = 0;
        
        if (boostLevel === 0) {
            requiredBoosts = 2;
            untilRequired = 2 - (guild.premiumSubscriptionCount || 0);
            nextBoostLevel = 1;
        } else if (boostLevel === 1) {
            requiredBoosts = 7;
            untilRequired = 7 - (guild.premiumSubscriptionCount || 0);
            nextBoostLevel = 2;
        } else if (boostLevel === 2) {
            requiredBoosts = 14;
            untilRequired = 14 - (guild.premiumSubscriptionCount || 0);
            nextBoostLevel = 3;
        } else {
            nextBoostLevel = 'Max Level Reached';
            requiredBoosts = 'Max Level Reached';
            untilRequired = 'Max Level Reached';
        }
        
        result = result.replace(/{server_nextboostlevel}/g, nextBoostLevel.toString());
        result = result.replace(/{server_nextboostlevel_required}/g, requiredBoosts.toString());
        result = result.replace(/{server_nextboostlevel_until_required}/g, untilRequired > 0 ? untilRequired.toString() : '0');
        
        // ========== SERVER SETTINGS ==========
        result = result.replace(/{server_prefix}/g, '/');
        result = result.replace(/{server_currency}/g, 'palette pieces');
    }
    
    // ========== CHANNEL INFORMATION ==========
    if (channel) {
        result = result.replace(/{channel}/g, `<#${channel.id}>`);
        result = result.replace(/{channel_name}/g, channel.name);
        result = result.replace(/{channel_createdate}/g, channel.createdAt.toDateString());
    }
    
    // ========== MISC ==========
    result = result.replace(/{date}/g, new Date().toLocaleString());
    result = result.replace(/{newline}/g, '\n');
    
    return result;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and manage custom embeds')
        .addSubcommand(sub => sub.setName('create').setDescription('Create a new embed').addStringOption(opt => opt.setName('name').setDescription('Embed name (no spaces, max 16 chars)').setRequired(true)))
        .addSubcommand(sub => sub.setName('edit').setDescription('Edit an existing embed').addStringOption(opt => opt.setName('name').setDescription('Embed name (leave empty to select from list)').setRequired(false)))
        .addSubcommand(sub => sub.setName('send').setDescription('Send an embed to a channel').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)).addChannelOption(opt => opt.setName('channel').setDescription('Channel to send to').setRequired(false)))
        .addSubcommand(sub => sub.setName('show').setDescription('Preview an embed').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all saved embeds'))
        .addSubcommand(sub => sub.setName('delete').setDescription('Delete an embed').addStringOption(opt => opt.setName('name').setDescription('Embed name').setRequired(true)))
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

        // CREATE EMBED
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

        // EDIT EMBED
        else if (sub === 'edit') {
            const embedName = interaction.options.getString('name');
            
            if (embedName) {
                const embeds = await db.get(`saved_embeds_${guildId}`) || {};
                if (!embeds[embedName]) {
                    return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
                }
                await showEmbedEditor(interaction, embedName, guildId);
                return;
            }
            
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

        // SEND EMBED
        else if (sub === 'send') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const embedData = embeds[embedName];
            
            if (!embedData) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }

            const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
            
            // Author - with full variable support
            if (embedData.authorName) {
                let authorText = await replacePlaceholders(embedData.authorName, interaction, targetChannel);
                let authorIcon = null;
                if (embedData.authorIcon) {
                    if (embedData.authorIcon === '{user_avatar}' || embedData.authorIcon === '{user_icon}') {
                        authorIcon = interaction.user.displayAvatarURL();
                    } else if (embedData.authorIcon === '{server_icon}') {
                        authorIcon = interaction.guild.iconURL();
                    } else {
                        authorIcon = await replacePlaceholders(embedData.authorIcon, interaction, targetChannel);
                    }
                }
                embed.setAuthor({ name: authorText, iconURL: authorIcon });
            }
            
            // Title
            if (embedData.title) {
                embed.setTitle(await replacePlaceholders(embedData.title, interaction, targetChannel));
            }
            
            // Description
            if (embedData.description) {
                embed.setDescription(await replacePlaceholders(embedData.description, interaction, targetChannel));
            }
            
            // Thumbnail
            if (embedData.thumbnail) {
                let thumbnail = embedData.thumbnail;
                if (thumbnail === '{user_avatar}' || thumbnail === '{user_icon}') {
                    thumbnail = interaction.user.displayAvatarURL();
                } else if (thumbnail === '{server_icon}') {
                    thumbnail = interaction.guild.iconURL();
                } else {
                    thumbnail = await replacePlaceholders(thumbnail, interaction, targetChannel);
                }
                embed.setThumbnail(thumbnail);
            }
            
            // Image
            if (embedData.image) {
                let image = embedData.image;
                if (image === '{user_avatar}' || image === '{user_icon}') {
                    image = interaction.user.displayAvatarURL();
                } else if (image === '{server_icon}') {
                    image = interaction.guild.iconURL();
                } else {
                    image = await replacePlaceholders(image, interaction, targetChannel);
                }
                embed.setImage(image);
            }
            
            // Footer
            if (embedData.footerText) {
                let footerText = await replacePlaceholders(embedData.footerText, interaction, targetChannel);
                let footerIcon = null;
                if (embedData.footerIcon) {
                    if (embedData.footerIcon === '{user_avatar}' || embedData.footerIcon === '{user_icon}') {
                        footerIcon = interaction.user.displayAvatarURL();
                    } else if (embedData.footerIcon === '{server_icon}') {
                        footerIcon = interaction.guild.iconURL();
                    } else {
                        footerIcon = await replacePlaceholders(embedData.footerIcon, interaction, targetChannel);
                    }
                }
                embed.setFooter({ text: footerText, iconURL: footerIcon });
            }
            
            // Timestamp
            if (embedData.timestamp) {
                embed.setTimestamp();
            }

            await targetChannel.send({ embeds: [embed] });
            await interaction.reply({ content: `✅ Embed sent to ${targetChannel}!`, ephemeral: true });
        }

        // SHOW PREVIEW
        else if (sub === 'show') {
            const embedName = interaction.options.getString('name').toLowerCase();
            const embeds = await db.get(`saved_embeds_${guildId}`) || {};
            const embedData = embeds[embedName];
            
            if (!embedData) {
                return interaction.reply({ content: `❌ Embed "${embedName}" not found!`, ephemeral: true });
            }

            const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
            
            if (embedData.authorName) {
                let authorText = await replacePlaceholders(embedData.authorName, interaction, interaction.channel);
                let authorIcon = null;
                if (embedData.authorIcon) {
                    if (embedData.authorIcon === '{user_avatar}' || embedData.authorIcon === '{user_icon}') {
                        authorIcon = interaction.user.displayAvatarURL();
                    } else if (embedData.authorIcon === '{server_icon}') {
                        authorIcon = interaction.guild.iconURL();
                    } else {
                        authorIcon = await replacePlaceholders(embedData.authorIcon, interaction, interaction.channel);
                    }
                }
                embed.setAuthor({ name: authorText, iconURL: authorIcon });
            }
            if (embedData.title) {
                embed.setTitle(await replacePlaceholders(embedData.title, interaction, interaction.channel));
            }
            if (embedData.description) {
                embed.setDescription(await replacePlaceholders(embedData.description, interaction, interaction.channel));
            }
            if (embedData.thumbnail) {
                let thumbnail = embedData.thumbnail;
                if (thumbnail === '{user_avatar}' || thumbnail === '{user_icon}') {
                    thumbnail = interaction.user.displayAvatarURL();
                } else if (thumbnail === '{server_icon}') {
                    thumbnail = interaction.guild.iconURL();
                } else {
                    thumbnail = await replacePlaceholders(thumbnail, interaction, interaction.channel);
                }
                embed.setThumbnail(thumbnail);
            }
            if (embedData.image) {
                let image = embedData.image;
                if (image === '{user_avatar}' || image === '{user_icon}') {
                    image = interaction.user.displayAvatarURL();
                } else if (image === '{server_icon}') {
                    image = interaction.guild.iconURL();
                } else {
                    image = await replacePlaceholders(image, interaction, interaction.channel);
                }
                embed.setImage(image);
            }
            if (embedData.footerText) {
                let footerText = await replacePlaceholders(embedData.footerText, interaction, interaction.channel);
                let footerIcon = null;
                if (embedData.footerIcon) {
                    if (embedData.footerIcon === '{user_avatar}' || embedData.footerIcon === '{user_icon}') {
                        footerIcon = interaction.user.displayAvatarURL();
                    } else if (embedData.footerIcon === '{server_icon}') {
                        footerIcon = interaction.guild.iconURL();
                    } else {
                        footerIcon = await replacePlaceholders(embedData.footerIcon, interaction, interaction.channel);
                    }
                }
                embed.setFooter({ text: footerText, iconURL: footerIcon });
            }
            if (embedData.timestamp) embed.setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // LIST EMBEDS
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

        // DELETE EMBED
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

        // EDIT AUTHOR
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

        // EDIT TITLE
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

        // EDIT DESCRIPTION
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

        // EDIT COLOR
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

        // EDIT THUMBNAIL
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

        // EDIT IMAGE
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

        // EDIT FOOTER
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

        // EDIT TIMESTAMP
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