import type { MedalClip } from "./types";

export const clipIdRegex = /^\/games\/([^/]+\/clips\/[^/]+)\/?$/i;
export function parseClipId(url: string) {
	const parsed = URL.parse(url);
	return parsed?.hostname === "medal.tv"
		? parsed?.pathname.match(clipIdRegex)?.[1]
		: undefined;
}

const clipDataRegex = /{\\"clip\\":({.+?}),\\"profileColor/;
export async function getClipInfo(clipId: string) {
	const res = await fetch(`https://medal.tv/games/${clipId}`, {
		cf: {
			cacheKey: clipId,
			cacheTtl: 300,
		},
		headers: {
			accept: "text/html",
		},
	});
	if (!res.ok) return;

	const html = await res.text();
	const rawClipData = html.match(clipDataRegex)?.[1];

	let clipData: MedalClip | undefined;
	try {
		clipData = JSON.parse(JSON.parse(`"${rawClipData}"`));
	} catch {
		return undefined;
	}

	return clipData;
}
