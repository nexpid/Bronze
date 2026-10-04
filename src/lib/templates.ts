import type { APIMessageTopLevelComponent } from "discord-api-types/v10";
import constants from "../constants";

// TODO write actual opengraph metadata
export const websiteTemplate = (
	url: string,
	component: APIMessageTopLevelComponent,
) =>
	`<!DOCTYPE html><html><head><!-- ${constants.app.githubUrl} -->
<script id="discord:component-embed" type="application/json">${JSON.stringify({ component })}</script><meta http-equiv="refresh" content="0;url=${url}"/></head></html>`;

// export const videoOpenGraphTemplate = (
// 	clip: MedalClip,
// ) => `<meta name="og:type" content="video.other">
// <meta name="og:video" content=${JSON.stringify(clip.contentUrl)}>
// <meta name="og:video:secure_url" content=${JSON.stringify(clip.contentUrl)}>
// <meta name="og:video:width" content="${clip.sourceWidth}">
// <meta name="og:video:height" content="${clip.sourceHeight}">
// <meta name="og:video:type" content="video/mp4">
// <meta name="og:image" content=${JSON.stringify(clip.thumbnailUrl)}>
// <meta name="twitter:card" content="player">
// <meta name="twitter:image" content=${JSON.stringify(clip.thumbnailUrl)}>
// <meta name="twitter:player" content=${JSON.stringify(clip.contentUrl)}>
// <meta name="twitter:player:width" content="${clip.sourceWidth}">
// <meta name="twitter:player:height" content="${clip.sourceHeight}">
// <meta name="twitter:player:stream" content=${JSON.stringify(clip.contentUrl)}>
// <meta name="twitter:player:stream:content_type" content="video/mp4">`;
