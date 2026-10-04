import { writeFile } from "node:fs/promises";
import { getClipInfo } from "../src/api";

await writeFile(
	"example.json",
	JSON.stringify(
		await getClipInfo("roblox/clips/nEfU337Ek0hd4Sexn"),
		undefined,
		"\t",
	),
);
