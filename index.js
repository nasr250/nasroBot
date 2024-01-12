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

client.on("messageCreate", async message => {
  if(message.content === "ping") {
    message.channel.send("pong")
  }
});

client.on("messageCreate", async message => {
  if(message.content === "aaaaaa") {
    message.channel.send("je stinkt")
  }
});
