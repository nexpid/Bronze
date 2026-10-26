import constants from "../constants";
import { retrieveProxyUrl, transmuxPlaylist } from "../lib/remux";
import {
	type ByteRange,
	makeRoute,
	normalizeRange,
	parseRangeHeader,
	sha256Hex,
} from "../utils";

type LoadedVideo =
	| {
			fromBucket: true;
			body?: ReadableStream;
			size: number;
			range?: ByteRange;
	  }
	| {
			fromBucket: false;
			bytes: Uint8Array;
			size: number;
	  };

async function loadVideo(
	playlistUrl: string,
	key: string,
	hash: string,
	req: Request<unknown, IncomingRequestCfProperties<unknown>>,
	env: Env,
) {
	const headers = new Headers({
		"content-type": "video/mp4",
		"accept-ranges": "bytes",
		"cache-control": cacheControl,
	});
	const object = (
		req.method === "GET"
			? await env.VIDEOS.get(key, {
					range: req.headers,
				})
			: await env.VIDEOS.head(key)
	) as R2ObjectBody | R2Object | null;
	if (object) {
		object.writeHttpMetadata(headers);
		headers.set("etag", object.httpEtag);

		return {
			video: {
				fromBucket: true,
				body: "body" in object ? object.body : undefined,
				size: object.size,
				range: object.range
					? normalizeRange(object.range, object.size)
					: undefined,
			} as LoadedVideo,
			headers,
		};
	}

	let data: Uint8Array;
	try {
		data = await transmuxPlaylist(playlistUrl);
	} catch (error) {
		if (error instanceof Error && !error.message.includes("status 410"))
			console.error(error);
		return;
	}

	headers.set("etag", `"${hash}"`);
	return {
		video: {
			fromBucket: false,
			bytes: data,
			size: data.byteLength,
		} as LoadedVideo,
		headers,
	};
}

const cacheControl = `public, max-age=${constants.app.videoCacheTtl}, s-maxage=${constants.app.videoCacheTtl}, immutable`;

export default makeRoute(async (url, req, ctx, env) => {
	const isHead = req.method === "HEAD";
	const requestedRange = req.headers.get("range");

	const playlistUrl = retrieveProxyUrl(url);
	if (!playlistUrl) return new Response(null, { status: 404 });

	const hash = await sha256Hex(playlistUrl);
	const key = `${hash}.mp4`;

	// redirectenv to S3 URL if possible
	const bucketUrl = env.VIDEOS_BUCKET_PUBLIC_URL;
	if (bucketUrl) {
		const object = await env.VIDEOS.head(key);
		if (object)
			return Response.redirect(new URL(key, bucketUrl).toString(), 307);
	}

	// load/transmux video
	const loaded = await loadVideo(playlistUrl, key, hash, req, env);
	if (!loaded) return new Response(null, { status: 404 });

	const { video, headers } = loaded;
	headers.set("content-length", String(video.size));

	// save video if possible
	if (!video.fromBucket && video.size < constants.app.maxObjectSize) {
		ctx.waitUntil(
			env.VIDEOS.put(key, video.bytes, {
				httpMetadata: { contentType: "video/mp4" },
				onlyIf: { etagDoesNotMatch: "*" },
			}).catch((error) => console.error("Failed to save video to R2", error)),
		);
	}

	// handle range requests manually (if needed)
	const range = video.fromBucket
		? video.range
		: parseRangeHeader(requestedRange, video.size);
	if (!isHead && range && requestedRange) {
		headers.set(
			"content-range",
			`bytes ${range.start}-${range.end - 1}/${video.size}`,
		);
		headers.set("content-length", String(range.end - range.start));

		return new Response(
			video.fromBucket ? video.body : video.bytes.slice(range.start, range.end),
			{ status: 206, headers },
		);
	}

	if (isHead) return new Response(null, { headers });
	return new Response(video.fromBucket ? video.body : video.bytes, { headers });
});
