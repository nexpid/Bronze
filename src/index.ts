/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import constants from "./constants";
import * as routes from "./routes";

export default {
	async fetch(req, env, ctx): Promise<Response> {
		const url = new URL(req.url);
		if (req.method === "GET") {
			if (url.pathname.startsWith("/games/"))
				return await routes.embed(url, req, env, ctx);
			else if (url.pathname.startsWith("/proxy/"))
				return await routes.proxy(url, req, env, ctx);
		}

		if (req.method !== "POST" || url.pathname !== "/api/interaction")
			return Response.redirect(constants.app.githubUrl);

		return await routes.interaction(url, req, env, ctx);
	},
} satisfies ExportedHandler<Env>;
