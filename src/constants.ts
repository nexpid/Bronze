export default {
	app: {
		cacheTtl: 600,
		// https://github.com/FxEmbed/FxEmbed/blob/main/src/worker.ts#L94-L95
		userAgentMatcher:
			/(discordbot|telegrambot|facebook|whatsapp|firefox\/92|vkshare|revoltchat|preview|iframely)/gi,
		githubUrl: "http://github.com/nexpid/Bronze",
	},
	domains: {
		raw: ["d.fxmedal.top", "raw.fxmedal.top"],
		base: ["medal.tv", "fxmedal.top"],
	},
	medal: {
		color: 0xbff83e,
		defaultEmoji: "🎮",
		emoji: (await import("./emoji.json")) as unknown as Record<
			string,
			[emojiId: number, color: number]
		>,
		clip: (clip: string) => `https://medal.tv/games/${clip}`,
		category: (category: string) =>
			`https://medal.tv/games/${encodeURIComponent(category)}`,
		subgame: (category: string, subgame: string) =>
			`https://medal.tv/games/${encodeURIComponent(category)}/experiences/${encodeURIComponent(subgame)}`,
		user: (user: string) => `https://medal.tv/u/${encodeURIComponent(user)}`,
	},
};
