import * as dotenv from 'dotenv';
dotenv.config();
import fs from "fs";

import {OpenAI} from 'openai';
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI,
});

import { Client, GatewayIntentBits, Attachment} from 'discord.js'; // Merk op dat de correcte import wordt gebruikt
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


const myAssistant = await openai.beta.assistants.retrieve("asst_AVhV4A9XW3OQHzStx6Tqq4Nu");
// Map om gebruikers aan threads te koppelen
const userThreadMap = new Map();


client.on("messageCreate", async (message) => {
  let server = message.guild.name, // ID of the guild the message was sent in
  channel = message.channel.id // ID of the channel the message was sent in

  // Controleer of het bericht is verzonden door een andere gebruiker dan de bot
  if (message.author.bot) return;

  // Controleer of de bot wordt getagd en de inhoud van het bericht "ping" is
  const botMention = message.mentions.has(client.user);
  const hasPing = message.content.toLowerCase().includes("ping");
  const hasRndImage = message.content.toLowerCase().includes("!image random");
  if(hasPing)
  {
   // Reageer op het bericht met "Pong!"
   message.reply("Pong!");
  }
  

  if(hasRndImage)
  {
    const mediaPath = './media/';
    const files = fs.readdirSync(mediaPath);
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const filePath = `${mediaPath}${randomFile}`; 
    message.reply({files: [filePath] });
  }

  if(botMention)
  {
    const contentAfterMention = message.content.split(/ +/).slice(1).join(' ');
    if(botMention && contentAfterMention.length < 1)
    {
      message.reply("Wat wil je?");
    }
    else
    {
      const prompt = contentAfterMention;
      console.log(prompt);

      let threadId = userThreadMap.get(channel);
      if (!threadId) {
        // Als de gebruiker geen thread heeft, maak er een aan
        const thread = await openai.beta.threads.create();
        threadId = thread.id;

        // Koppel de gebruiker aan de thread
        userThreadMap.set(channel, threadId);
      }

      
      //create message
      const gptMessage = await openai.beta.threads.messages.create(
        threadId,
        {
          role: "user",
          content: prompt
        }
      );

      //run assistant
      const run = await openai.beta.threads.runs.create(
        threadId,
        { 
          assistant_id: myAssistant.id,
          instructions:"je bent een chatbot genaamd nasroBot die in de discord server " + server + " zit, als mensen jou vragen stellen beantwoord jij die. Als zij grappen maken met je, moet je de grappen terug bij hun doen.  reageer met een grappige comeback als ze vervelend doen. praat met nederlandse straattaal maar wees cool ermee. Adopteer het taalgebruik van de gebruikers waarmee je praat. de naam op wie je reageert is " + message.author.displayName, 
        }
      );

    // Wacht tot de API-oproep is voltooid
    await waitForCompletion(threadId, run.id);

    // Berichten ophalen en verwerken nadat de API-oproep is voltooid
    const messages = await openai.beta.threads.messages.list(threadId);
    message.reply(messages.body.data[0].content[0].text.value);
  }
}
}
);

// Functie om te wachten tot de API-oproep is voltooid
const waitForCompletion = async (threadId, runId) => {
  let runStatus;

  // Herhaal totdat de status 'completed' is
  do {
    // Pauzeer voor een korte tijd voordat je de status controleert
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Controleer de status van de API-oproep
    runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
  } while (runStatus.status !== 'completed');
};
