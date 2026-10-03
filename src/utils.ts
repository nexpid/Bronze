import {
	type APIChatInputApplicationCommandInteraction,
	type APIInteractionResponse,
	type APIInteractionResponseCallbackData,
	InteractionResponseType,
	type RESTPatchAPIWebhookWithTokenMessageJSONBody,
	RouteBases,
	Routes,
} from "discord-api-types/v10";

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
