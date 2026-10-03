import { REST } from "@discordjs/rest";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionContextType,
	type RESTPutAPIApplicationCommandsJSONBody,
	Routes,
} from "discord-api-types/v10";

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("Please set a DISCORD_TOKEN variable in .env");

const commands = [
	{
		type: ApplicationCommandType.ChatInput,
		name: "pingus",
		description: "Pingus!",
		contexts: [
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel,
		],
	},
	{
		type: ApplicationCommandType.ChatInput,
		name: "medal",
		description: "Embed a Medal.tv clip",
		options: [
			{
				name: "url",
				type: ApplicationCommandOptionType.String,
				description: "URL of the clip",
				required: true,
			},
		],
		contexts: [
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel,
		],
	},
] as RESTPutAPIApplicationCommandsJSONBody;

// lazy!
const userId = Buffer.from(
	token.slice(0, token.indexOf(".")),
	"base64",
).toString("utf8");
const rest = new REST({ version: "10" }).setToken(token);

console.log(
	await rest.put(Routes.applicationCommands(userId), {
		body: commands,
	}),
);
