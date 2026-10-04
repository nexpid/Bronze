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
import { getClipInfo, parseClipId } from "./api";
import constants from "./constants";
import { makeDiscordEmbed } from "./embed";
import { videoOpenGraphTemplate, websiteTemplate } from "./templates";
import { deferReply } from "./utils";

const make: (response: APIInteractionResponse) => Response = Response.json;
const makeMessage = (data: APIInteractionResponseCallbackData) =>
	make({
		type: InteractionResponseType.ChannelMessageWithSource,
		data,
	});

const textDecoder = new TextDecoder();
export default {
	async fetch(req, env, ctx): Promise<Response> {
		const url = new URL(req.url);
		if (req.method === "GET" && url.pathname.startsWith("/games/")) {
			const realUrl = new URL(url);
			realUrl.hostname = "medal.tv";
			realUrl.protocol = "https";
			realUrl.searchParams.delete("invite");

			const rawHost = constants.domains.raw.includes(url.hostname);
			const userAgent = req.headers.get("user-agent");
			if (!userAgent?.match(constants.app.userAgentMatcher))
				return Response.redirect(realUrl.toString());

			const parsed = parseClipId(url.pathname);
			if (!parsed) return Response.redirect(realUrl.toString());

			const clip = await getClipInfo(parsed.clipId);
			if (!clip) return Response.redirect(realUrl.toString());

			if (rawHost || parsed.raw)
				return new Response(videoOpenGraphTemplate(clip), {
					headers: {
						"content-type": "text/html",
						"cache-control": `public, max-age=${constants.app.cacheTtl}`,
					},
				});

			return new Response(websiteTemplate(makeDiscordEmbed(clip)), {
				headers: {
					"content-type": "text/html",
					"cache-control": `public, max-age=${constants.app.cacheTtl}`,
				},
			});
		} else if (req.method !== "POST" || url.pathname !== "/api/interaction")
			return Response.redirect(constants.app.githubUrl);

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
				const url = interaction.data.options?.find((x) => x.name === "url");
				if (url?.type !== ApplicationCommandOptionType.String)
					return makeMessage({
						content: "Missing a URL to embed!",
						flags: MessageFlags.Ephemeral,
					});

				const parsedUrl = URL.parse(url.value);
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
						content: `Failed to load the [Medal.tv clip](${url.value})! Is it public?`,
					});

				// TODO reupload clip if raw is specified
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
