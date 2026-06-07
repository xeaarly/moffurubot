const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const db = require('./database-mongo.js');

const { handleEmbedButtons, handleEmbedModals, showEmbedEditor } = require('./handlers/embedHandler.js');
const { handleAutoresponder } = require('./handlers/autoresponderHandler.js');

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

// Handle interactions (slash commands + buttons + modals + dropdowns)
client.on('interactionCreate', async interaction => {
    // Slash commands
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
    
    // Handle embed selection dropdown
    if (interaction.isStringSelectMenu() && interaction.customId === 'embed_select_edit') {
        const embedName = interaction.values[0];
        const guildId = interaction.guildId;
        await showEmbedEditor(interaction, embedName, guildId);
    }
    
    // Buttons
    if (interaction.isButton()) {
        await handleEmbedButtons(interaction);
    }
    
    // Modals
    if (interaction.isModalSubmit()) {
        await handleEmbedModals(interaction);
    }
});

// Handle messages for autoresponder
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    await handleAutoresponder(message);
});

client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

client.login(process.env.TOKEN);