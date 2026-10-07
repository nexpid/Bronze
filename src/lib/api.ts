import constants from "../constants";
import type { MedalClip } from "../types";

export function parseClipId(pathname: string) {
	const [gamesConstant, gameId, clipsConstant, clipId, ...args] = pathname
		.slice(1)
		.split("/");
	if (
		gamesConstant !== "games" ||
		!gameId ||
		clipsConstant !== "clips" ||
		!clipId
	)
		return;

	return {
		clipId,
		raw: args[0] === "raw",
	};
}

// const clipDataRegex = /{\\"clip\\":({.+?}),\\"profileColor/;
export async function getClipInfo(clipId: string) {
	const res = await fetch(constants.medal.apiClip(clipId), {
		cf: {
			cacheTtl: constants.app.cacheTtl,
		},
		headers: {
			accept: "application/json",
		},
	});
	if (!res.ok) return;

	const data = (await res.json().catch(() => undefined)) as
		| MedalClip
		| undefined;
	if (!data?.contentId) return;

	return data;
}
