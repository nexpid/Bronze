import constants from "../constants";
import { getClipInfo, parseClipId } from "../lib/api";
import { makeDiscordEmbed } from "../lib/embed";
import { makeProxyUrl } from "../lib/remux";
import { websiteTemplate } from "../lib/templates";
import { getCanonRedirect, makeRoute } from "../utils";

export default makeRoute(async (url, req) => {
	const canon = getCanonRedirect(url);

	const parsed = parseClipId(url.pathname);
	if (!parsed) return Response.redirect(canon);

	const clip = await getClipInfo(parsed.clipId);
	if (!clip) return Response.redirect(canon);

	const rawHost = constants.domains.raw.includes(url.hostname);
	const videoUrl = makeProxyUrl(clip, url) ?? clip.contentUrl;
	if (rawHost || parsed.raw) return Response.redirect(videoUrl);

	const body = websiteTemplate(canon, makeDiscordEmbed(clip, videoUrl));
	return new Response(req.method === "HEAD" ? null : body, {
		headers: {
			"content-type": "text/html",
			"content-length": String(new TextEncoder().encode(body).byteLength),
			"cache-control": `public, max-age=${constants.app.cacheTtl}`,
		},
	});
});
