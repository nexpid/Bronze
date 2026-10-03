/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { isChatInputApplicationCommandInteraction } from "discord-api-types/utils";
import {
	type APIInteraction,
	type APIInteractionResponse,
	type APIInteractionResponseCallbackData,
	ApplicationCommandOptionType,
	InteractionResponseType,
	InteractionType,
	MessageFlags,
} from "discord-api-types/v10";
import { verifyKey } from "discord-interactions";
import { clipIdRegex, getClipInfo, parseClipId } from "./api";
import { makeDiscordEmbed } from "./embed";
import { deferReply } from "./utils";

const GH_URL = "http://github.com/nexpid/Bronze";

const textDecoder = new TextDecoder();

const make: (response: APIInteractionResponse) => Response = Response.json;
const makeMessage = (data: APIInteractionResponseCallbackData) =>
	make({
		type: InteractionResponseType.ChannelMessageWithSource,
		data,
	});

export default {
	async fetch(req, env, ctx): Promise<Response> {
		const url = new URL(req.url);
		if (req.method === "GET" && url.pathname.startsWith("/games/")) {
			const realUrl = new URL(url);
			realUrl.hostname = "medal.tv";
			realUrl.protocol = "https";

			const userAgent = req.headers.get("user-agent");
			console.log(userAgent);
			if (!userAgent?.includes("https://discordapp.com"))
				return Response.redirect(realUrl.toString());

			const clipId = url.pathname.match(clipIdRegex)?.[1];
			if (!clipId) return Response.redirect(realUrl.toString());

			const clip = await getClipInfo(clipId);
			console.log(clip);
			if (!clip) return Response.redirect(realUrl.toString());

			const component = makeDiscordEmbed(clip);
			return new Response(
				`<script id="discord:component-embed" type="application/json">${JSON.stringify(
					{
						component,
					},
				)}</script>`,
				{
					headers: {
						"Content-Type": "text/html",
					},
				},
			);
		} else if (req.method !== "POST" || url.pathname !== "/api/interaction")
			return Response.redirect(GH_URL);

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
			case "pingus": {
				return makeMessage({
					content: "Pingus!",
				});
			}
			case "medal": {
				const url = interaction.data.options?.find((x) => x.name === "url");
				if (url?.type !== ApplicationCommandOptionType.String)
					return makeMessage({
						content: "Missing a URL to embed!",
						flags: MessageFlags.Ephemeral,
					});

				const clipId = parseClipId(url.value);
				if (!clipId)
					return makeMessage({
						content:
							"You must pass a valid [**Medal.tv**](<https://medal.tv/>) clip URL to embed!",
						flags: MessageFlags.Ephemeral,
					});

				const { promise, edit } = await deferReply(interaction);
				ctx.waitUntil(promise);

				const clip = await getClipInfo(clipId);
				if (!clip)
					return await edit({
						content: `Failed to load the [Medal.tv clip](${url.value})! Is it public?`,
					});

				const embed = makeDiscordEmbed(clip);
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
	},
} satisfies ExportedHandler<Env>;
