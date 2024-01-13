const dotenv = require('dotenv');
dotenv.config();

const { Client, GatewayIntentBits } = require('discord.js'); // Merk op dat de correcte import wordt gebruikt

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ],
});


client.login(process.env.DISCORD_TOKEN);
client.once('ready', () => {
  console.log('Bot is ready!');
});

client.on("messageCreate", async (message) => {
  // Controleer of het bericht is verzonden door een andere gebruiker dan de bot
  if (message.author.bot) return;

  // Controleer of de bot wordt getagd en de inhoud van het bericht "ping" is
  const botMention = message.mentions.has(client.user);
  const hasPing = message.content.toLowerCase().includes("ping");

  if (botMention && hasPing) {
    // Reageer op het bericht met "Pong!"
    message.reply("Pong!");
  }
});
