import constants from "./constants";
import type { MedalClip } from "./types";

export function parseClipId(path: string) {
	const [gamesConstant, gameId, clipsConstant, rawClipId, ...args] = path
		.slice(1)
		.split("/");
	if (
		gamesConstant !== "games" ||
		!gameId ||
		clipsConstant !== "clips" ||
		!rawClipId
	)
		return;

	return {
		clipId: [gameId, clipsConstant, rawClipId].join("/"),
		raw: args[0] === "raw",
	};
}

const clipDataRegex = /{\\"clip\\":({.+?}),\\"profileColor/;
export async function getClipInfo(clipId: string) {
	const res = await fetch(constants.medal.clip(clipId), {
		cf: {
			cacheKey: clipId,
			cacheTtl: constants.app.cacheTtl,
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
