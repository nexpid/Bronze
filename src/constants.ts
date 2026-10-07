export default {
	app: {
		// https://github.com/FxEmbed/FxEmbed/blob/e035b0e28bb417b67cc63759647d540ae03af6c6/src/worker.ts#L94-L95
		userAgentMatcher:
			/(discordbot|telegrambot|facebook|whatsapp|firefox\/92|vkshare|revoltchat|preview|iframely)/gi,
		githubUrl: "http://github.com/nexpid/Bronze",
		cacheTtl: 10 * 60,
		videoCacheTtl: 4 * 60 * 60,
		maxObjectSize: 50 * 1024 * 1024,
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
		maxClipDuration: 2 * 60,
		apiClip: (clip: string) => `https://medal.tv/api/content/${encodeURIComponent(clip)}`,
		category: (category: string) =>
			`https://medal.tv/games/${encodeURIComponent(category)}`,
		subgame: (category: string, subgame: string) =>
			`https://medal.tv/games/${encodeURIComponent(category)}/experiences/${encodeURIComponent(subgame)}`,
		user: (user: string) => `https://medal.tv/u/${encodeURIComponent(user)}`,
		hls: (id: string, playlist: string, bebit: string) =>
			`https://medal.tv/api/hls/${encodeURIComponent(id)}/${encodeURIComponent(playlist)}?bebit=${encodeURIComponent(bebit)}`,
	},
};
