import * as dotenv from 'dotenv';
dotenv.config();
import {Client,GatewayIntentBits, REST, Routes} from 'discord.js';
const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  client.login(process.env.DISCORD_TOKEN);
const commands = [
    {
        name: 'hey',
        description: 'Replies with hey!',
    },
    {
        name: 'join',
        description: 'Joins a Voice Channel',
    }
];
const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN);
(async () => 
{
    try{
        console.log('Started refreshing application (/) commands.');

        // Haal de lijst met servers (guilds) op waar de bot lid van is
        const guilds = await client.guilds.fetch();
        
        // Loop door elke server en registreer de slash-commando's
        for (const guild of guilds.values()) {
            await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
            { body: commands },
          );
        }
    
        console.log('Successfully reloaded application (/) commands.');
    }
    catch(error){
        console.log(`there was an error: ${error}`);
    }
}
)();

