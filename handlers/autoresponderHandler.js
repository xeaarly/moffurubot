const { EmbedBuilder } = require('discord.js');
const db = require('../database-mongo.js');

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
async function replacePlaceholders(text, user, guild, channel, message, client) {
    if (!text) return text;
    
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
    
    // ========== MESSAGE INFORMATION ==========
    if (message) {
        result = result.replace(/{message_id}/g, message.id);
        result = result.replace(/{message_content}/g, message.content);
        result = result.replace(/{message_link}/g, message.url);
    }
    
    // ========== MISC ==========
    result = result.replace(/{date}/g, new Date().toLocaleString());
    result = result.replace(/{newline}/g, '\n');
    
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
                    
                    // Author
                    if (embedData.authorName) {
                        let authorText = await replacePlaceholders(embedData.authorName, user, guild, channel, message);
                        let authorIcon = null;
                        if (embedData.authorIcon) {
                            if (embedData.authorIcon === '{user_avatar}' || embedData.authorIcon === '{user_icon}') {
                                authorIcon = user.displayAvatarURL();
                            } else if (embedData.authorIcon === '{server_icon}') {
                                authorIcon = guild.iconURL();
                            } else {
                                authorIcon = await replacePlaceholders(embedData.authorIcon, user, guild, channel, message);
                            }
                        }
                        embed.setAuthor({ name: authorText, iconURL: authorIcon });
                    }
                    
                    // Title
                    if (embedData.title) {
                        embed.setTitle(await replacePlaceholders(embedData.title, user, guild, channel, message));
                    }
                    
                    // Description
                    if (embedData.description) {
                        embed.setDescription(await replacePlaceholders(embedData.description, user, guild, channel, message));
                    }
                    
                    // Thumbnail
                    if (embedData.thumbnail) {
                        let thumbnail = embedData.thumbnail;
                        if (thumbnail === '{user_avatar}' || thumbnail === '{user_icon}') {
                            thumbnail = user.displayAvatarURL();
                        } else if (thumbnail === '{server_icon}') {
                            thumbnail = guild.iconURL();
                        } else {
                            thumbnail = await replacePlaceholders(thumbnail, user, guild, channel, message);
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
                            image = await replacePlaceholders(image, user, guild, channel, message);
                        }
                        embed.setImage(image);
                    }
                    
                    // Footer
                    if (embedData.footerText) {
                        let footerText = await replacePlaceholders(embedData.footerText, user, guild, channel, message);
                        let footerIcon = null;
                        if (embedData.footerIcon) {
                            if (embedData.footerIcon === '{user_avatar}' || embedData.footerIcon === '{user_icon}') {
                                footerIcon = user.displayAvatarURL();
                            } else if (embedData.footerIcon === '{server_icon}') {
                                footerIcon = guild.iconURL();
                            } else {
                                footerIcon = await replacePlaceholders(embedData.footerIcon, user, guild, channel, message);
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
                let response = await replacePlaceholders(data.response, message.author, message.guild, message.channel, message);
                await message.reply({ content: response });
            }
            break;
        }
    }
}

module.exports = { handleAutoresponder };