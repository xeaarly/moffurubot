const { EmbedBuilder } = require('discord.js');
const db = require('../database-mongo.js');

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
                    const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
                    
                    // Author - handle placeholders
                    if (embedData.authorName) {
                        let authorText = embedData.authorName
                            .replace(/{user}/g, user.username)
                            .replace(/{user_name}/g, user.username)
                            .replace(/{user_tag}/g, user.username);
                        let authorIcon = null;
                        if (embedData.authorIcon) {
                            if (embedData.authorIcon === '{user_avatar}' || embedData.authorIcon === '{user_icon}') {
                                authorIcon = user.displayAvatarURL();
                            } else {
                                authorIcon = embedData.authorIcon;
                            }
                        }
                        embed.setAuthor({ name: authorText, iconURL: authorIcon });
                    }
                    
                    // Title
                    if (embedData.title) {
                        embed.setTitle(embedData.title
                            .replace(/{user}/g, user.username)
                            .replace(/{user_name}/g, user.username)
                            .replace(/{user_tag}/g, user.username));
                    }
                    
                    // Description
                    if (embedData.description) {
                        embed.setDescription(embedData.description
                            .replace(/{user}/g, user.username)
                            .replace(/{user_name}/g, user.username)
                            .replace(/{user_tag}/g, user.username)
                            .replace(/{newline}/g, '\n'));
                    }
                    
                    // Thumbnail
                    if (embedData.thumbnail) {
                        let thumbnail = embedData.thumbnail;
                        if (thumbnail === '{user_avatar}' || thumbnail === '{user_icon}') {
                            thumbnail = user.displayAvatarURL();
                        }
                        embed.setThumbnail(thumbnail);
                    }
                    
                    // Image
                    if (embedData.image) {
                        let image = embedData.image;
                        if (image === '{user_avatar}' || image === '{user_icon}') {
                            image = user.displayAvatarURL();
                        }
                        embed.setImage(image);
                    }
                    
                    // Footer
                    if (embedData.footerText) {
                        let footerText = embedData.footerText
                            .replace(/{user}/g, user.username)
                            .replace(/{user_name}/g, user.username)
                            .replace(/{user_tag}/g, user.username);
                        let footerIcon = null;
                        if (embedData.footerIcon) {
                            if (embedData.footerIcon === '{user_avatar}' || embedData.footerIcon === '{user_icon}') {
                                footerIcon = user.displayAvatarURL();
                            } else {
                                footerIcon = embedData.footerIcon;
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
                // Text response with placeholders
                let response = data.response
                    .replace(/{user}/g, message.author.username)
                    .replace(/{user_name}/g, message.author.username)
                    .replace(/{user_tag}/g, message.author.username)
                    .replace(/{newline}/g, '\n');
                await message.reply({ content: response });
            }
            break;
        }
    }
}

module.exports = { handleAutoresponder };