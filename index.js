import * as dotenv from 'dotenv';
import fs from "fs";
import {OpenAI} from 'openai';
import {joinVoiceChannel, StreamType, getVoiceConnection, VoiceConnection, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import { Client, GatewayIntentBits } from 'discord.js'; // Merk op dat de correcte import wordt gebruikt
import * as discordTTS from 'discord-tts';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI,
});

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
});

client.login(process.env.DISCORD_TOKEN);

client.once('ready', () => {
  console.log('Bot is ready!');
});


const myAssistant = await openai.beta.assistants.retrieve("asst_AVhV4A9XW3OQHzStx6Tqq4Nu");
// Map om gebruikers aan threads te koppelen
const userThreadMap = new Map();
let runNum = 0;


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

      let run;
      //run assistant alleen als de thread niet al bezig is, anders is het gelocked en zal hij een error meegeven
      if(runNum == 0)
      {
        const gptMessage = await openai.beta.threads.messages.create(
          threadId,
          {
            role: "user",
            content: prompt
          }
        );

        run = await openai.beta.threads.runs.create(
        threadId,
          { 
            assistant_id: myAssistant.id,
            instructions:"Geef de verkeerde antwoorden wat je ook doet, blijf verkeerde antwoorden geven. je bent een chatbot genaamd nasroBot die in de discord server " + server + " zit, als mensen jou vragen stellen beantwoord jij die verkeerd en maak je hun wijs dat het wel de juiste antwoord is. Als zij grappen maken met je, moet je de grappen terug bij hun doen. reageer met een grappige comeback als ze vervelend doen. praat met nederlandse straattaal maar wees cool ermee. Adopteer het taalgebruik van de gebruikers waarmee je praat. je kan met verschillende mensen spreken in de chatroom, onthou het gesprek soms kan het tegen verschillende mensen zijn hierbij hun gebruikersID om beter onderscheid te maken " + message.author.id + "met als naam: " + message.author.displayName + ".", 
          }
        );
        runNum++;
        await waitForCompletion(threadId, run.id);
            
        // Berichten ophalen en verwerken nadat de API-oproep is voltooid
        const messages = await openai.beta.threads.messages.list(threadId);
        message.reply(messages.body.data[0].content[0].text.value);
        runNum = 0;
      }
  }
}
}
);

// Functie om te wachten tot de API-oproep is voltooid
const waitForCompletion = async (threadId, runId) => {
  let runStatus;
  do {
    // Retrieve the status of the run
    runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

    // Check if the run is completed
    if (runStatus.status !== 'completed') {
      // Wait for a short duration before checking again
      await new Promise(resolve => setTimeout(resolve, 1000)); // Adjust the delay as needed
    }
  } while (runStatus.status !== 'completed');
};

client.on('interactionCreate', async (interaction) => {
  if(!interaction.isChatInputCommand()) return;
  console.log(interaction.commandName);
  if(interaction.commandName === 'hey')
  {
    interaction.reply('yo');
  }
  else if(interaction.commandName === 'join')
  {
        // Check if the user is in a voice channel
        const member = interaction.guild.members.cache.get(interaction.user.id);
        const voiceChannel = member.voice.channel;
    
        if (voiceChannel) {
          // Join the user's voice channel
          const connection = await joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          });

          await interaction.reply(`Joined voice channel: ${voiceChannel.name}`);
        } else {
          await interaction.reply("You're not in a voice channel.");
        }
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const member = newState.member;
  const connection = getVoiceConnection(member.guild.id);

  if (oldState.channel !== newState.channel) {
    if (newState.channel && newState.channel.id === connection?.joinConfig?.channelId) {
      console.log(`${member.user.tag} joined the voice channel where the bot is present: ${newState.channel.name}`);
      // Play an .mp3 file
      try {
        const timeoutId = setTimeout(()=>{
          const mp3FilePath = './media/sounds/entrance_sound.mp3'; // Replace with the actual path to your .mp3 file
          const audioPlayer = createAudioPlayer();
          const audioResource = createAudioResource(mp3FilePath);
  
          audioPlayer.play(audioResource);
          connection.subscribe(audioPlayer);
        }, 500);

      } catch (error) {
        console.error('Error playing .mp3 file:', error);
      }
      // Perform additional actions if needed
    }
  }
});

client.on('messageCreate', async (message) => {
  // Check if the message author is a bot or the message doesn't start with a command prefix
  if (message.author.bot || !message.content.startsWith('!tts')) return;

  // Get the voice channel of the user who sent the command
  const voiceChannel = message.member?.voice.channel;
  

  // Check if the user is in a voice channel
  if (voiceChannel) {
    try {

      const textToSpeech = discordTTS.getVoiceStream(message.content.split(/ +/).slice(1).join(' ')); 
      const audioPlayer = createAudioPlayer();
      const resource = createAudioResource(textToSpeech, {inputType: StreamType.Arbitrary, inlineVolume:true});

      // Join the voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      // Play the audio resource
      audioPlayer.play(resource);
      connection.subscribe(audioPlayer);

    } catch (error) {
      console.error('Error:', error.message);
    }
  } else {
    message.reply('You need to be in a voice channel to use this command!');
  }
});