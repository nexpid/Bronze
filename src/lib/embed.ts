import {
	type APIMessageTopLevelComponent,
	ComponentType,
	SeparatorSpacingSize,
} from "discord-api-types/v10";
import constants from "../constants";
import type { MedalClip } from "../types";
import { convertEmojiName, escapeText } from "../utils";

export function makeDiscordEmbed(
	clip: MedalClip,
	videoUrl: string,
): APIMessageTopLevelComponent {
	const emoji = constants.medal.emoji[clip.category.slug];
	const emojiName = convertEmojiName(clip.category.slug);
	const subgameLink = clip.subgame
		? (clip.subgame.joinUrl ??
			clip.subgame.metadata.joinUrl ??
			constants.medal.subgame(clip.category.slug, clip.subgame.id))
		: undefined;

	return {
		type: ComponentType.Container,
		accent_color: emoji?.[1] ?? constants.medal.color,
		components: [
			{
				type: ComponentType.TextDisplay,
				content: `${emoji?.[0] ? `<:${emojiName}:${emoji[0]}>` : constants.medal.defaultEmoji} ${clip.subgame ? `[**${escapeText(clip.subgame.name)}**](${subgameLink})` : `[**${escapeText(clip.category.categoryName)}**](${constants.medal.category(clip.category.slug)})`}  •  By [**${escapeText(clip.poster.displayName)}**](${constants.medal.user(clip.poster.userName)})`,
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
							url: videoUrl,
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
