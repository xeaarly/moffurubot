const { EmbedBuilder } = require('discord.js');
const db = require('../database-mongo.js');

// Helper function to replace all placeholders
function replacePlaceholders(text, user, guild, channel, message) {
    if (!text) return text;
    
    let result = text;
    
    // User information
    result = result.replace(/{user}/g, user.username);
    result = result.replace(/{user_name}/g, user.username);
    result = result.replace(/{user_tag}/g, user.tag || user.username);
    result = result.replace(/{user_id}/g, user.id);
    result = result.replace(/{user_avatar}/g, user.displayAvatarURL());
    result = result.replace(/{user_icon}/g, user.displayAvatarURL());
    result = result.replace(/{user_discrim}/g, user.discriminator || '0');
    
    // Nickname (if in guild)
    let nickname = user.username;
    if (guild && guild.members.cache.get(user.id)) {
        const member = guild.members.cache.get(user.id);
        nickname = member.nickname || user.username;
    }
    result = result.replace(/{user_nick}/g, nickname);
    
    // Server information
    if (guild) {
        result = result.replace(/{server_name}/g, guild.name);
        result = result.replace(/{server_id}/g, guild.id);
        result = result.replace(/{server_membercount}/g, guild.memberCount.toString());
        
        const owner = await guild.fetchOwner().catch(() => null);
        result = result.replace(/{server_owner}/g, owner ? owner.user.username : 'Unknown');
        result = result.replace(/{server_owner_id}/g, guild.ownerId || 'Unknown');
        result = result.replace(/{server_createdate}/g, guild.createdAt.toDateString());
        
        // Server icon
        if (guild.iconURL()) {
            result = result.replace(/{server_icon}/g, guild.iconURL());
        } else {
            result = result.replace(/{server_icon}/g, 'No icon');
        }
    }
    
    // Channel information
    if (channel) {
        result = result.replace(/{channel}/g, `<#${channel.id}>`);
        result = result.replace(/{channel_name}/g, channel.name);
        result = result.replace(/{channel_createdate}/g, channel.createdAt.toDateString());
    }
    
    // Message information
    if (message) {
        result = result.replace(/{message_content}/g, message.content);
        result = result.replace(/{message_id}/g, message.id);
        result = result.replace(/{message_link}/g, message.url);
    }
    
    // New line
    result = result.replace(/{newline}/g, '\n');
    
    // Date
    result = result.replace(/{date}/g, new Date().toLocaleString());
    
    return result;
}

async function handleAutoresponder(message) {
    const triggers = await db.get(`autoresponder_${message.guild.id}`) || {};
    const content = message.content.toLowerCase();
    
    for (const [trigger, data] of Object.entries(triggers)) {
        if (content.includes(trigger.toLowerCase())) {
            const embedMatch = data.response.match(/{embed:([^}]+)}/);
            
            if (embedMatch) {
                const embedName = embedMatch[1].toLowerCase();
                const savedEmbeds = await db.get(`saved_embeds_${message.guild.id}`) || {};
                const embedData = savedEmbeds[embedName];
                
                if (embedData) {
                    const user = message.author;
                    const guild = message.guild;
                    const channel = message.channel;
                    
                    const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
                    
                    // Author - handle all placeholders
                    if (embedData.authorName) {
                        let authorText = replacePlaceholders(embedData.authorName, user, guild, channel, message);
                        let authorIcon = null;
                        if (embedData.authorIcon) {
                            if (embedData.authorIcon === '{user_avatar}' || embedData.authorIcon === '{user_icon}') {
                                authorIcon = user.displayAvatarURL();
                            } else if (embedData.authorIcon === '{server_icon}') {
                                authorIcon = guild.iconURL();
                            } else {
                                authorIcon = replacePlaceholders(embedData.authorIcon, user, guild, channel, message);
                            }
                        }
                        embed.setAuthor({ name: authorText, iconURL: authorIcon });
                    }
                    
                    // Title
                    if (embedData.title) {
                        embed.setTitle(replacePlaceholders(embedData.title, user, guild, channel, message));
                    }
                    
                    // Description
                    if (embedData.description) {
                        embed.setDescription(replacePlaceholders(embedData.description, user, guild, channel, message));
                    }
                    
                    // Thumbnail
                    if (embedData.thumbnail) {
                        let thumbnail = embedData.thumbnail;
                        if (thumbnail === '{user_avatar}' || thumbnail === '{user_icon}') {
                            thumbnail = user.displayAvatarURL();
                        } else if (thumbnail === '{server_icon}') {
                            thumbnail = guild.iconURL();
                        } else {
                            thumbnail = replacePlaceholders(thumbnail, user, guild, channel, message);
                        }
                        embed.setThumbnail(thumbnail);
                    }
                    
                    // Image
                    if (embedData.image) {
                        let image = embedData.image;
                        if (image === '{user_avatar}' || image === '{user_icon}') {
                            image = user.displayAvatarURL();
                        } else if (image === '{server_icon}') {
                            image = guild.iconURL();
                        } else {
                            image = replacePlaceholders(image, user, guild, channel, message);
                        }
                        embed.setImage(image);
                    }
                    
                    // Footer
                    if (embedData.footerText) {
                        let footerText = replacePlaceholders(embedData.footerText, user, guild, channel, message);
                        let footerIcon = null;
                        if (embedData.footerIcon) {
                            if (embedData.footerIcon === '{user_avatar}' || embedData.footerIcon === '{user_icon}') {
                                footerIcon = user.displayAvatarURL();
                            } else if (embedData.footerIcon === '{server_icon}') {
                                footerIcon = guild.iconURL();
                            } else {
                                footerIcon = replacePlaceholders(embedData.footerIcon, user, guild, channel, message);
                            }
                        }
                        embed.setFooter({ text: footerText, iconURL: footerIcon });
                    }
                    
                    // Timestamp
                    if (embedData.timestamp) {
                        embed.setTimestamp();
                    }
                    
                    await message.reply({ embeds: [embed] });
                } else {
                    await message.reply({ content: `❌ Embed "${embedName}" not found!` });
                }
            } else {
                // Text response with all placeholders
                let response = replacePlaceholders(data.response, message.author, message.guild, message.channel, message);
                await message.reply({ content: response });
            }
            break;
        }
    }
}

module.exports = { handleAutoresponder };