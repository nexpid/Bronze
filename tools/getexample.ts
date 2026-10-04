import { writeFile } from "node:fs/promises";
import { getClipInfo } from "../src/lib/api";

await writeFile(
	"example.json",
	JSON.stringify(
		await getClipInfo(
			"valorant/clips/mIjZ9jYPZboe0K4tQ?invite=cr-MSx5ZDQsMTk2MTA2Mzgy",
		),
		undefined,
		"\t",
	),
);
