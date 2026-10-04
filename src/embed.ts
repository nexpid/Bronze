import {
	type APIMessageTopLevelComponent,
	ComponentType,
	SeparatorSpacingSize,
} from "discord-api-types/v10";
import emojis from "./emoji.json";
import type { MedalClip } from "./types";
import { convertEmojiName, escapeText } from "./utils";

const emojiData = emojis as unknown as Record<
	string,
	[emojiId: string, color: number]
>;
export function makeDiscordEmbed(clip: MedalClip): APIMessageTopLevelComponent {
	const emoji = emojiData[clip.category.slug];
	const emojiName = convertEmojiName(clip.category.slug);
	const subgameLink = clip.subgame
		? (clip.subgame.joinUrl ??
			clip.subgame.metadata.joinUrl ??
			`https://medal.tv/games/${encodeURIComponent(clip.category.slug)}/experiences/${encodeURIComponent(clip.subgame.id)}`)
		: undefined;

	return {
		type: ComponentType.Container,
		accent_color: emoji?.[1] ?? 0xbff83e,
		components: [
			{
				type: ComponentType.TextDisplay,
				content: `${emoji?.[0] ? `<:${emojiName}:${emoji[0]}>` : "🎮"} ${clip.subgame ? `[**${escapeText(clip.subgame.name)}**](${subgameLink})` : `[**${escapeText(clip.category.categoryName)}**](https://medal.tv/games/${encodeURIComponent(clip.category.slug)})`} by [**${escapeText(clip.poster.displayName)}**](https://medal.tv/u/${encodeURIComponent(clip.poster.userName)})`,
			},
			{
				type: ComponentType.TextDisplay,
				content: `# [${escapeText(clip.contentTitle)}](${clip.contentShareUrl})`,
			},
			{
				type: ComponentType.MediaGallery,
				items: [
					{
						media: {
							url: clip.contentUrl,
						},
					},
				],
			},
			{
				type: ComponentType.Separator,
				divider: true,
				spacing: SeparatorSpacingSize.Small,
			},
			{
				type: ComponentType.TextDisplay,
				content: `-# **${clip.views.toLocaleString("en-US")} view${clip.views !== 1 ? "s" : ""}**  •  <t:${Math.floor(clip.contentUploadedAt / 1000)}:R>`,
			},
		],
		spoiler: false,
	};
}
