import {
	type APIChatInputApplicationCommandInteraction,
	type APIInteractionResponse,
	type APIInteractionResponseCallbackData,
	InteractionResponseType,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	RouteBases,
	Routes,
} from "discord-api-types/v10";

export function makeRoute(
	handler: (
		url: URL,
		req: Request<unknown, IncomingRequestCfProperties<unknown>>,
		env: Env,
		ctx: ExecutionContext<unknown>,
	) => Promise<Response>,
) {
	return handler;
}

export const make: (response: APIInteractionResponse) => Response =
	Response.json;

export const makeMessage = (data: APIInteractionResponseCallbackData) =>
	make({
		type: InteractionResponseType.ChannelMessageWithSource,
		data,
	});

export async function deferReply(
	interaction: APIChatInputApplicationCommandInteraction,
) {
	const { promise, resolve } = Promise.withResolvers<undefined>();

	await fetch(
		RouteBases.api +
			Routes.interactionCallback(interaction.id, interaction.token),
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				type: InteractionResponseType.DeferredChannelMessageWithSource,
			} satisfies APIInteractionResponse),
		},
	);

	return {
		promise,
		async edit(
			body: RESTPatchAPIWebhookWithTokenMessageJSONBody,
			headers?: HeadersInit,
		) {
			await fetch(
				RouteBases.api +
					Routes.webhookMessage(interaction.application_id, interaction.token),
				{
					method: "PATCH",
					headers: headers ?? {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(body),
				},
			);
			resolve(undefined);
			return new Response(null, { status: 202 });
		},
	};
}

export function convertEmojiName(slug: string) {
	return `${slug
		.replace(/-/g, "_")
		.replace(/[^a-z0-9_]/gi, "")
		.slice(0, 30)
		.padStart(2, "g")}`;
}

export const escapeText = (text: string) =>
	text
		.replace(/[_~|*[\]]/g, "")
		.replace(/\p{RGI_Emoji}/gv, "")
		.replace(/ +/g, " ")
		.trim();

export async function sha256Hex(text: string) {
	const buf = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(text),
	);
	return [...new Uint8Array(buf)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

// R2Size has a cursed type
export function parseRange(
	range: { suffix?: number; offset?: number; length?: number },
	size: number,
) {
	let start = 0,
		end = size;

	if (range.suffix !== undefined) {
		start = Math.max(0, size - range.suffix);
	} else {
		start = range.offset ?? 0;
		end = range.length !== undefined ? start + range.length : size;
	}

	return { start, end: Math.min(end, size) };
}
