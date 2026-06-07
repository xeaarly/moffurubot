const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const db = require('./database-mongo.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    console.log(`Loaded: ${command.data.name}`);
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Error!', ephemeral: true });
        }
    }
});

// Handle message commands for autoresponder
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    const triggers = await db.get(`autoresponder_${message.guild.id}`) || {};
    const content = message.content.toLowerCase();
    
    for (const [trigger, data] of Object.entries(triggers)) {
        if (content.includes(trigger.toLowerCase())) {
            // Check if it's an embed response
            const embedMatch = data.response.match(/{embed:([^}]+)}/);
            
            if (embedMatch) {
                const embedName = embedMatch[1].toLowerCase();
                const savedEmbeds = await db.get(`saved_embeds_${message.guild.id}`) || {};
                const embedData = savedEmbeds[embedName];
                
                if (embedData) {
                    const embed = new EmbedBuilder().setColor(embedData.color || 0xffb7c5);
                    if (embedData.title) embed.setTitle(embedData.title);
                    if (embedData.description) embed.setDescription(embedData.description);
                    await message.reply({ embeds: [embed] });
                }
            } else {
                // Text response
                let response = data.response.replace(/{user}/g, message.author.username);
                await message.reply({ content: response });
            }
            break;
        }
    }
});

client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

client.login(process.env.TOKEN);