import constants from "../constants";
import { getClipInfo, parseClipId } from "../lib/api";
import { makeDiscordEmbed } from "../lib/embed";
import { makeProxyUrl } from "../lib/remux";
import { websiteTemplate } from "../lib/templates";
import { makeRoute } from "../utils";

export default makeRoute(async (url) => {
	const canon = new URL(url);
	canon.hostname = "medal.tv";
	canon.protocol = "https";
	canon.searchParams.delete("invite");
	const canonUrl = canon.toString();

	const parsed = parseClipId(url.pathname);
	if (!parsed) return Response.redirect(canonUrl);

	const clip = await getClipInfo(parsed.clipId);
	if (!clip) return Response.redirect(canonUrl);

	const rawHost = constants.domains.raw.includes(url.hostname);
	const videoUrl = makeProxyUrl(clip, url) ?? clip.contentUrl;
	if (rawHost || parsed.raw) return Response.redirect(videoUrl);

	return new Response(
		websiteTemplate(canonUrl, makeDiscordEmbed(clip, videoUrl)),
		{
			headers: {
				"content-type": "text/html",
				"cache-control": `public, max-age=${constants.app.cacheTtl}`,
			},
		},
	);
});
