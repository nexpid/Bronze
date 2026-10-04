import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { REST } from "@discordjs/rest";
import {
	type RESTPostAPIApplicationEmojiJSONBody,
	type RESTPostAPIApplicationEmojiResult,
	Routes,
} from "discord-api-types/v10";
import icojs from "icojs";
import sharp from "sharp";
import { convertEmojiName } from "../src/utils";

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("Please set a DISCORD_TOKEN variable in .env");

// lazy!
const userId = Buffer.from(
	token.slice(0, token.indexOf(".")),
	"base64",
).toString("utf8");
const rest = new REST({ version: "10" }).setToken(token);

const dataPath = join(import.meta.dirname, "../src/emoji.json");
const emojiData = (await JSON.parse(
	await readFile(dataPath, "utf8"),
)) as Record<string, [emojiId: string, color: number | null]>;

let writeTimeout: NodeJS.Timeout | undefined;
function writeData() {
	clearTimeout(writeTimeout);
	writeTimeout = setTimeout(
		() => writeFile(dataPath, JSON.stringify(emojiData)),
		5e3,
	);
}

async function parseImage(image: ArrayBuffer) {
	// is ICO?
	const header = Buffer.from(image.slice(0, 2));
	if (header.at(0) === 0 && header.at(1) === 0) {
		const images = await icojs.decodeIco(image);
		const icon = images.reduce(
			(max, img) => (img.width > max.width ? img : max),
			images[0],
		);
		if (!icon) throw new Error("No ico available!");

		return icon.buffer;
	} else {
		return image;
	}
}

const SAT_WEIGHT = 4;

const counts = new Uint32Array(4096);
const sums = new Uint32Array(4096 * 3);
const scores = new Float32Array(4096);
async function computeCommonColor(image: ArrayBuffer) {
	const { data, info } = await sharp(image, { failOn: "none" })
		.resize(32, 32, { fit: "inside", kernel: "linear" })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	counts.fill(0);
	sums.fill(0);
	scores.fill(0);
	const ch = info.channels;

	for (let i = 0; i < data.length; i += ch) {
		if (data[i + 3] < 128) continue;

		const r = data[i],
			g = data[i + 1],
			b = data[i + 2];
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		const sat = max === 0 ? 0 : (max - min) / max;

		const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
		counts[key]++;
		scores[key] += 1 + sat * SAT_WEIGHT;
		sums[key * 3] += r;
		sums[key * 3 + 1] += g;
		sums[key * 3 + 2] += b;
	}

	let best = -1,
		bestScore = 0;
	for (let k = 0; k < 4096; k++) {
		if (scores[k] > bestScore) {
			bestScore = scores[k];
			best = k;
		}
	}

	const n = best >= 0 && counts[best];
	return n
		? (Math.round(sums[best * 3] / n) << 16) +
				(Math.round(sums[best * 3 + 1] / n) << 8) +
				Math.round(sums[best * 3 + 2] / n)
		: null;
}

const gamesPerPage = 100;
for (let i = 0; i < 11; i++) {
	console.log(`[page ${i + 1}] Fetching 100 games`);
	const games = (await fetch(
		`https://medal.tv/api/categories?sortBy=popularityScore&sortDirection=DESC&limit=${gamesPerPage}&offset=${gamesPerPage * i}&gamesOnly=true`,
		{
			cache: "force-cache",
		},
	).then((x) => x.json())) as {
		slug: string;
		icon: string;
	}[];

	for (const game of games) {
		if (!game.icon) continue;

		try {
			const image = await fetch(game.icon, { cache: "force-cache" })
				.then((x) => x.arrayBuffer())
				.then((x) => parseImage(x));

			const color = await computeCommonColor(image).catch(console.warn);
			if (typeof color !== "number") {
				console.error(
					`[page ${i + 1}] failed to compute ${game.slug}`,
					game.icon,
				);
				continue;
			}

			if (!(game.slug in emojiData)) {
				const emojiName = convertEmojiName(game.slug);

				const img = await sharp(image)
					.resize(128, 128, { fit: "inside", kernel: "linear" })
					.ensureAlpha()
					.avif()
					.toBuffer();
				const emoji = (await rest.post(Routes.applicationEmojis(userId), {
					body: {
						name: emojiName,
						image: `data:image/avif;base64,${img.toString("base64")}`,
					} as RESTPostAPIApplicationEmojiJSONBody,
				})) as RESTPostAPIApplicationEmojiResult;
				emojiData[game.slug] = [emoji.id, color];
				console.log(`[page ${i + 1}] uploaded :${emojiName}:`);
			} else {
				emojiData[game.slug][1] = color;
			}

			writeData();
		} catch (error) {
			console.error(`[page ${i + 1}] errored at ${game.slug}`, error);
		}
	}
}

writeData();
console.log("done");
