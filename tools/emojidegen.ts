import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const gen = JSON.parse(
	await readFile(join(import.meta.dirname, "../src/emoji.json"), "utf8"),
);
await writeFile(
	join(import.meta.dirname, "../emojidegen.json"),
	JSON.stringify(
		Object.fromEntries(
			Object.entries(gen).map(([key, val]: [string, [number, number]]) => [
				key,
				`#${val[1].toString(16).padStart(6, "0")}`,
			]),
		),
		undefined,
		"\t",
	),
);
