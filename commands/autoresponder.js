const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database-mongo.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Manage auto-responses')
        .addSubcommand(sub => sub.setName('add').setDescription('Add trigger').addStringOption(opt => opt.setName('trigger').setDescription('Word').setRequired(true)).addStringOption(opt => opt.setName('response').setDescription('Reply or {embed:name}').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove trigger').addStringOption(opt => opt.setName('trigger').setDescription('Word').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List triggers')),
    
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: 'Need Manage Messages permission!', ephemeral: true });
        }
        
        if (sub === 'add') {
            const trigger = interaction.options.getString('trigger').toLowerCase();
            const response = interaction.options.getString('response');
            
            let triggers = await db.get(`autoresponder_${guildId}`) || {};
            if (triggers[trigger]) {
                return interaction.reply({ content: `Trigger "${trigger}" already exists!`, ephemeral: true });
            }
            
            triggers[trigger] = { response: response };
            await db.set(`autoresponder_${guildId}`, triggers);
            
            const embed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setTitle('AutoResponder Added')
                .setDescription(`Trigger: ${trigger}\nResponse: ${response.substring(0, 100)}`);
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        else if (sub === 'remove') {
            const trigger = interaction.options.getString('trigger').toLowerCase();
            let triggers = await db.get(`autoresponder_${guildId}`) || {};
            
            if (!triggers[trigger]) {
                return interaction.reply({ content: `Trigger "${trigger}" not found!`, ephemeral: true });
            }
            
            delete triggers[trigger];
            await db.set(`autoresponder_${guildId}`, triggers);
            await interaction.reply({ content: `Removed "${trigger}"`, ephemeral: true });
        }
        
        else if (sub === 'list') {
            let triggers = await db.get(`autoresponder_${guildId}`) || {};
            let list = Object.keys(triggers);
            
            if (list.length === 0) {
                return interaction.reply({ content: 'No triggers! Use /autoresponder add', ephemeral: true });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setTitle('AutoResponders')
                .setDescription(list.map((t, i) => `${i+1}. ${t}`).join('\n'));
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};