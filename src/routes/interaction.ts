import { isChatInputApplicationCommandInteraction } from "discord-api-types/utils";
import {
	type APIInteraction,
	type APIInteractionResponse,
	ApplicationCommandOptionType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
} from "discord-api-types/v10";
import { verifyKey } from "discord-interactions";
import constants from "../constants";
import { getClipInfo, parseClipId } from "../lib/api";
import { makeDiscordEmbed } from "../lib/embed";
import { makeProxyUrl } from "../lib/remux";
import { deferReply, makeMessage, makeRoute } from "../utils";

const textDecoder = new TextDecoder();
export default makeRoute(async (url, req, env, ctx) => {
	const signature = req.headers.get("X-Signature-Ed25519");
	const timestamp = req.headers.get("X-Signature-Timestamp");
	if (!signature || !timestamp)
		return new Response("Missing signature or timestamp", { status: 401 });

	const body = await req.arrayBuffer();
	const isValidRequest = await verifyKey(
		body,
		signature,
		timestamp,
		env.PUBLIC_KEY,
	);
	if (!isValidRequest)
		return new Response("Bad request signature", { status: 401 });

	const interaction = JSON.parse(textDecoder.decode(body)) as APIInteraction;
	if (interaction.type === InteractionType.Ping) {
		return Response.json({
			type: InteractionResponseType.Pong,
		} satisfies APIInteractionResponse);
	}

	if (
		interaction.type !== InteractionType.ApplicationCommand ||
		!isChatInputApplicationCommandInteraction(interaction)
	)
		return makeMessage({
			content: "Invalid interaction :<",
			flags: MessageFlags.Ephemeral,
		});

	switch (interaction.data.name) {
		case "medal": {
			const clipUrl = interaction.data.options?.find((x) => x.name === "url");
			if (clipUrl?.type !== ApplicationCommandOptionType.String)
				return makeMessage({
					content: "Missing a URL to embed!",
					flags: MessageFlags.Ephemeral,
				});

			const parsedUrl = URL.parse(clipUrl.value);
			const isValid =
				parsedUrl &&
				(constants.domains.base.includes(parsedUrl.hostname) ||
					constants.domains.raw.includes(parsedUrl.hostname));
			const parsed = isValid && parseClipId(parsedUrl.pathname);
			if (!parsed)
				return makeMessage({
					content:
						"You must pass a valid [**Medal.tv**](<https://medal.tv/>) clip URL to embed!",
					flags: MessageFlags.Ephemeral,
				});

			const { promise, edit } = await deferReply(interaction);
			ctx.waitUntil(promise);

			const clip = await getClipInfo(parsed.clipId);
			if (!clip)
				return await edit({
					content: `Failed to load the [Medal.tv clip](${clipUrl.value})! Is it public?`,
				});

			// TODO reupload clip if raw is specified
			const videoUrl = makeProxyUrl(clip, url) ?? clip.contentUrl;
			const embed = makeDiscordEmbed(clip, videoUrl);
			return await edit({
				flags: MessageFlags.IsComponentsV2,
				components: [embed],
				allowed_mentions: {
					parse: [],
				},
			});
		}
		default: {
			console.error(`Unknown interaction: ${interaction.data.name}`);
			return makeMessage({
				content: "Unknown interaction :<",
				flags: MessageFlags.Ephemeral,
			});
		}
	}
});
