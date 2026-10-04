import constants from "../constants";
import { retrieveProxyUrl, transmuxPlaylist } from "../lib/remux";
import { makeRoute, parseRange, sha256Hex } from "../utils";

export default makeRoute(async (url, req, env, ctx) => {
	const playlistUrl = retrieveProxyUrl(url);
	if (!playlistUrl) return new Response(null, { status: 404 });

	const key = await sha256Hex(playlistUrl);
	const etag = JSON.stringify(key);
	const cacheControl = `public, max-age=${constants.app.videoCacheTtl}, s-maxage=${constants.app.videoCacheTtl}, immutable`;

	const object = await env.VIDEOS.get(key, {
		range: req.headers,
	});
	if (object) {
		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set("accept-ranges", "bytes");
		headers.set("cache-control", cacheControl);
		headers.set("etag", etag);

		const ifNoneMatch = req.headers
			.get("if-none-match")
			?.split(",")
			.map((x) => x.trim().replace(/^W\//, ""));
		if (
			!("body" in object) ||
			ifNoneMatch?.includes("*") ||
			ifNoneMatch?.includes(etag)
		)
			return new Response(null, { status: 304, headers });

		let status = 200;
		const range = object.range && parseRange(object.range, object.size);
		if (range && (range.start !== 0 || range.end !== object.size)) {
			status = 206;
			headers.set(
				"content-range",
				`bytes ${range.start}-${range.end - 1}/${object.size}`,
			);
		} else {
			headers.set("content-length", String(object.size));
		}

		return new Response(object.body, { status, headers });
	}

	const data = await transmuxPlaylist(playlistUrl);
	if (data.byteLength > constants.app.maxObjectSize) {
		return new Response(data, {
			headers: {
				"content-type": "video/mp4",
				"accept-ranges": "none",
				"content-length": String(data.byteLength),
				"cache-control": cacheControl,
				etag,
			},
		});
	}

	ctx.waitUntil(
		env.VIDEOS.put(key, data, {
			httpMetadata: { contentType: "video/mp4" },
			onlyIf: { etagDoesNotMatch: "*" },
		}).catch((error) => console.error("failed to save video to R2", error)),
	);

	return new Response(data, {
		headers: {
			"content-type": "video/mp4",
			"accept-ranges": "bytes",
			"content-length": String(data.byteLength),
			"cache-control": cacheControl,
			etag,
		},
	});
});
