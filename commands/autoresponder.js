const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database-mongo.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoresponder')
        .setDescription('Manage auto-response triggers (Mimu style)')
        .addSubcommand(sub => sub.setName('add').setDescription('Add a text or embed auto-response').addStringOption(opt => opt.setName('trigger').setDescription('Word that triggers the response').setRequired(true)).addStringOption(opt => opt.setName('response').setDescription('Response text or {embed:name} for saved embeds').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove an auto-response trigger').addStringOption(opt => opt.setName('trigger').setDescription('Trigger word to remove').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List all auto-response triggers')),
    
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
                .setDescription(`Trigger: ${trigger}\nResponse: ${response}\n\nTip: Use {user} to mention the user, {newline} for line breaks!`);
            
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
            await interaction.reply({ content: `Removed trigger: ${trigger}`, ephemeral: true });
        }
        
        else if (sub === 'list') {
            let triggers = await db.get(`autoresponder_${guildId}`) || {};
            let list = Object.keys(triggers);
            
            if (list.length === 0) {
                return interaction.reply({ content: 'No AutoResponders found! Use /autoresponder add to create one.', ephemeral: true });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xffb7c5)
                .setTitle('AutoResponders')
                .setDescription(list.map((t, i) => `${i+1}. ${t}`).join('\n'))
                .setFooter({ text: `Total: ${list.length} triggers` });
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};