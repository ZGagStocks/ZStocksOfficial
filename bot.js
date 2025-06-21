const fs = require('fs');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

const TOKEN = 'YOUR_BOT_TOKEN';
const CLIENT_ID = 'YOUR_CLIENT_ID';

const STOCK_API_URL = 'http://localhost:3000/api/stock';

const rolesFile = './roles.json';

let rolesConfig = {};
try {
  rolesConfig = JSON.parse(fs.readFileSync(rolesFile));
} catch {
  rolesConfig = {};
}

function saveRoles() {
  fs.writeFileSync(rolesFile, JSON.stringify(rolesConfig, null, 2));
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let updateInterval = null;

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('ping-roles-seeds')
      .setDescription('Manage seed ping roles')
      .addSubcommand(sub =>
        sub
          .setName('set')
          .setDescription('Assign a role to a seed')
          .addStringOption(opt => opt.setName('seed').setDescription('Seed name').setRequired(true))
          .addRoleOption(opt => opt.setName('role').setDescription('Role to ping').setRequired(true))
      ),
    new SlashCommandBuilder()
      .setName('ping-roles-gears')
      .setDescription('Manage gear ping roles')
      .addSubcommand(sub =>
        sub
          .setName('set')
          .setDescription('Assign a role to a gear item')
          .addStringOption(opt => opt.setName('gear').setDescription('Gear name').setRequired(true))
          .addRoleOption(opt => opt.setName('role').setDescription('Role to ping').setRequired(true))
      ),
    new SlashCommandBuilder()
      .setName('ping-roles-eggs')
      .setDescription('Manage egg ping roles')
      .addSubcommand(sub =>
        sub
          .setName('set')
          .setDescription('Assign a role to an egg')
          .addStringOption(opt => opt.setName('egg').setDescription('Egg name').setRequired(true))
          .addRoleOption(opt => opt.setName('role').setDescription('Role to ping').setRequired(true))
      ),
    new SlashCommandBuilder()
      .setName('stock')
      .setDescription('Control automatic stock updates')
      .addSubcommand(sub =>
        sub.setName('start').setDescription('Start automatic stock updates')
      )
      .addSubcommand(sub =>
        sub.setName('stop').setDescription('Stop automatic stock updates')
      ),
  ].map(c => c.toJSON());

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
}

async function fetchStock() {
  const res = await fetch(STOCK_API_URL);
  if (!res.ok) throw new Error(`Failed to fetch stock: ${res.status}`);
  const json = await res.json();
  return {
    seeds: json.seeds || [],
    gear: json.gear || [],
    egg: json.egg || [],
  };
}

function buildStockMessage(stockData, guildId) {
  const cfg = rolesConfig[guildId] || { seeds: {}, gear: {}, egg: {} };
  const lines = [];

  if (stockData.seeds.length) lines.push('## SeedStock Update');
  stockData.seeds.forEach(item => {
    const roleId = cfg.seeds[item.name];
    const rolePing = roleId ? `<@&${roleId}> ` : '';
    lines.push(`**x${item.stock}** ${rolePing}\`${item.name}\``);
  });

  if (stockData.gear.length) lines.push('\n## GearStock Update');
  stockData.gear.forEach(item => {
    const roleId = cfg.gear[item.name];
    const rolePing = roleId ? `<@&${roleId}> ` : '';
    lines.push(`**x${item.stock}** ${rolePing}\`${item.name}\``);
  });

  if (stockData.egg.length) lines.push('\n## EggStock Update');
  stockData.egg.forEach(item => {
    const roleId = cfg.egg[item.name];
    const rolePing = roleId ? `<@&${roleId}> ` : '';
    lines.push(`**x${item.stock}** ${rolePing}\`${item.name}\``);
  });

  lines.push(`\n**Updated <t:${Math.floor(Date.now() / 1000)}:R>**`);

  return lines.join('\n');
}

let lastStockJson = null;

async function sendStockUpdate() {
  try {
    const stockData = await fetchStock();
    const stockJson = JSON.stringify(stockData);
    if (stockJson === lastStockJson) return;

    lastStockJson = stockJson;

    for (const guild of client.guilds.cache.values()) {
      const channel = guild.channels.cache.find(c => c.name === 'grow-stock' && c.isTextBased());
      if (!channel) continue;

      const message = buildStockMessage(stockData, guild.id);
      await channel.send({ content: message });
    }
  } catch (e) {
    console.error('Error sending stock update:', e);
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply({ content: 'This command can only be used in servers.', ephemeral: true });
  }

  const cmd = interaction.commandName;

  if (!rolesConfig[guildId]) {
    rolesConfig[guildId] = { seeds: {}, gear: {}, egg: {} };
  }

  if (cmd === 'ping-roles-seeds') {
    const seed = interaction.options.getString('seed');
    const role = interaction.options.getRole('role');
    rolesConfig[guildId].seeds[seed] = role.id;
    saveRoles();
    await interaction.reply(`Set ping role for seed **${seed}** to <@&${role.id}>`);
  } else if (cmd === 'ping-roles-gears') {
    const gear = interaction.options.getString('gear');
    const role = interaction.options.getRole('role');
    rolesConfig[guildId].gear[gear] = role.id;
    saveRoles();
    await interaction.reply(`Set ping role for gear **${gear}** to <@&${role.id}>`);
  } else if (cmd === 'ping-roles-eggs') {
    const egg = interaction.options.getString('egg');
    const role = interaction.options.getRole('role');
    rolesConfig[guildId].egg[egg] = role.id;
    saveRoles();
    await interaction.reply(`Set ping role for egg **${egg}** to <@&${role.id}>`);
  } else if (cmd === 'stock') {
    const sub = interaction.options.getSubcommand();
    if (sub === 'start') {
      if (updateInterval) {
        await interaction.reply('Stock updates are already running.');
      } else {
        updateInterval = setInterval(sendStockUpdate, 60 * 1000);
        await interaction.reply('Started automatic stock updates every minute.');
        sendStockUpdate();
      }
    } else if (sub === 'stop') {
      if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
        await interaction.reply('Stopped automatic stock updates.');
      } else {
        await interaction.reply('Stock updates are not running.');
      }
    }
  }
});

client.login(TOKEN);
