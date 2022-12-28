import { watch, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createReadStream, createWriteStream } from "node:fs";
import { spawn } from "node:child_process";

type AutocryptOptions = {
	directory: string;
	key: string;
	program?: string;
	signal?: AbortSignal;
	onDetectFile?: (arg0: string) => void;
};

export default async function autocrypt({
	directory,
	key,
	program = "xor",
	signal = new AbortController().signal,
	onDetectFile = () => undefined,
}: AutocryptOptions) {
	try {
		const watcher = watch(directory, { signal });

		for await (const event of watcher) {
			if (
				event.filename.endsWith(`.${program}`) ||
				event.filename.endsWith(".crdownload") ||
				event.eventType === "change"
			) {
				continue;
			}

			const fileName = resolve(directory, event.filename);

			let fileStat;
			try {
				fileStat = await stat(fileName);
			} catch (error: any) {
				if (error.code === "ENOENT") continue;
				else throw new Error(error);
			}

			if (fileStat.isDirectory()) {
				console.error(`${fileName}: Cannot watch events on nested directories`);
				continue;
			}

			if (!fileStat.isFile()) {
				console.error(`${fileName}: Unknown file type`);
				continue;
			}

			onDetectFile(fileName);
			const child = spawn(program, [key], {
				stdio: ["pipe", "pipe", "inherit"],
			});

			createReadStream(fileName).pipe(child.stdin);
			child.stdout.pipe(createWriteStream(`${fileName}.${program}`));

			child.on("close", () => {
				// Remove original file
				spawn("rm", [fileName]);
			});
		}
	} catch (err: any) {
		if (err?.name === "AbortError") return;
		throw new Error(err);
	}
}
