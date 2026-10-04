import muxjs from "mux.js";
import constants from "../constants";
import type { MedalClip } from "../types";

const linkMatcher = /^https?:\/\/.+$/gm,
	hostnameMatcher = /^|\.medal\.tv$/;
function matchLinks(text: string) {
	return (
		text.match(linkMatcher)?.filter((url) => {
			const hostname = URL.parse(url)?.hostname;
			return hostname && hostnameMatcher.test(hostname);
		}) ?? []
	);
}

async function fetchText(url: string) {
	const res = await fetch(url, {
		cf: { cacheTtl: constants.app.videoCacheTtl },
	});
	if (!res.ok) {
		await res.body?.cancel();
		throw new Error(`Failed to fetch playlist: ${res.status}`);
	}

	return res.text();
}

async function fetchChunk(url: string, i: number) {
	const res = await fetch(url, {
		cf: { cacheTtl: constants.app.videoCacheTtl },
	});
	if (!res.ok) {
		await res.body?.cancel();
		throw new Error(`Failed to fetch chunk ${i}: ${res.status}`);
	}

	return new Uint8Array(await res.arrayBuffer());
}

const prefetchLimit = 4;
export async function transmuxPlaylist(playlistUrl: string) {
	const sourcePlaylistUrl = matchLinks(await fetchText(playlistUrl))[0];
	if (!sourcePlaylistUrl)
		throw new Error("Failed to find source playlist link");

	const chunks = matchLinks(await fetchText(sourcePlaylistUrl));
	if (!chunks[0]) throw new Error("Failed to find first chunk");

	const transmuxer = new muxjs.mp4.Transmuxer({
		keepOriginalTimestamps: true,
		remux: true,
	});

	const parts: Uint8Array[] = [];
	let sentInit = false;
	transmuxer.on("data", (segment) => {
		if (!sentInit) {
			sentInit = true;
			parts.push(segment.initSegment);
		}
		parts.push(segment.data);
	});

	const fetching = new Map<number, Promise<Uint8Array>>();
	function start(i: number) {
		if (i >= chunks.length || fetching.has(i)) return;
		const req = fetchChunk(chunks[i], i);
		req.catch(() => {});
		fetching.set(i, req);
	}

	for (let i = 0; i < prefetchLimit; i++) start(i);

	for (let i = 0; i < chunks.length; i++) {
		const req = fetching.get(i);
		if (!req) continue;

		const data = await req;
		fetching.delete(i);
		start(i + prefetchLimit);
		transmuxer.push(data);
		transmuxer.flush();
	}
	transmuxer.dispose();

	let offset = 0;
	const output = new Uint8Array(parts.reduce((n, x) => n + x.byteLength, 0));
	for (const part of parts) {
		output.set(part, offset);
		offset += part.byteLength;
	}
	return output;
}

const defaultPlaylist = "master.m3u8",
	proxyExt = ".mp4";
export function makeProxyUrl(clip: MedalClip, base: URL) {
	if (clip.videoLengthSeconds > constants.medal.maxClipDuration)
		return clip.thumbnailUrl;

	const url = URL.parse(clip.contentUrlHls);
	if (!url) return;

	// expected format medal.tv/api/hls/XYZ/master.m3u8?bebit=ABC
	const [apiConstant, hlsConstant, id, playlist] = url.pathname
		.slice(1)
		.split("/");
	if (apiConstant !== "api" || hlsConstant !== "hls" || !id || !playlist)
		return;

	const params = new URLSearchParams();
	if (playlist !== defaultPlaylist) params.append("playlist", playlist);
	params.append("bebit", url.searchParams.get("bebit") || "");

	return new URL(
		`/proxy/${encodeURIComponent(id)}${proxyExt}?${params}`,
		base,
	).toString();
}

export function retrieveProxyUrl(url: URL) {
	const id = decodeURIComponent(url.pathname.slice(1).split("/")[1]);
	if (!id) return;

	return constants.medal.hls(
		id.slice(0, -proxyExt.length),
		url.searchParams.get("playlist") || defaultPlaylist,
		url.searchParams.get("bebit") || "",
	);
}
