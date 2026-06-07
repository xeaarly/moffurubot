const { EmbedBuilder } = require('discord.js');
const db = require('../database-mongo.js');

async function handleAutoresponder(message) {
    const triggers = await db.get(`autoresponder_${message.guild.id}`) || {};
    const content = message.content.toLowerCase();
    
    for (const [trigger, data] of Object.entries(triggers)) {
        if (content.includes(trigger)) {
            const embedMatch = data.response.match(/{embed:([^}]+)}/);
            
            if (embedMatch) {
                const embedName = embedMatch[1].toLowerCase();
                const savedEmbeds = await db.get(`saved_embeds_${message.guild.id}`) || {};
                const embedData = savedEmbeds[embedName];
                
                if (embedData) {
                    const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
                    if (embedData.authorName) embed.setAuthor({ name: embedData.authorName.replace(/{user}/g, message.author.username) });
                    if (embedData.title) embed.setTitle(embedData.title.replace(/{user}/g, message.author.username));
                    if (embedData.description) embed.setDescription(embedData.description.replace(/{user}/g, message.author.username).replace(/{newline}/g, '\n'));
                    if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
                    if (embedData.image) embed.setImage(embedData.image);
                    if (embedData.footerText) embed.setFooter({ text: embedData.footerText.replace(/{user}/g, message.author.username) });
                    
                    await message.reply({ embeds: [embed] });
                }
            } else {
                let response = data.response.replace(/{user}/g, message.author.username).replace(/{newline}/g, '\n');
                await message.reply({ content: response });
            }
            break;
        }
    }
}

module.exports = { handleAutoresponder };