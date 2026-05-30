const { Client, GatewayIntentBits, Collection } = require('discord.js');
require('dotenv').config();
const fs = require('fs');

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
    console.log(` Loaded command: ${command.data.name}`);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: ' An error occurred!', ephemeral: true });
    }
});

client.on('clientReady', () => {
    console.log(`${client.user.tag} is online!`);
    
    // Rotating statuses
    const statuses = [
        { name: 'paint dry', type: 3 },                           // Watching paint dry
        { name: 'the server\'s inactive state', type: 3 },        // Watching server's inactive state
        { name: 'watercolor dreams', type: 4, state: '🎨 painting in moffuru' },  // Custom
        { name: 'brush strokes', type: 3 },                       // Watching brush strokes
        { name: 'with watercolors', type: 0 }                     // Playing with watercolors
    ];
    
    let i = 0;
    setInterval(() => {
        const status = statuses[i % statuses.length];
        if (status.type === 4) {
            client.user.setActivity(status.name, { type: status.type, state: status.state });
        } else {
            client.user.setActivity(status.name, { type: status.type });
        }
        client.user.setStatus('online');
        i++;
    }, 10000); // Changes every 10 seconds
});

client.login(process.env.TOKEN);
