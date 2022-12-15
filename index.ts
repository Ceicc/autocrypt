import { watch, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createReadStream, createWriteStream } from "node:fs";
import { spawn } from "node:child_process";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { program, directory, key } = await yargs(hideBin(process.argv))
	.scriptName("Autocrypt")
	.strict()
	.option("directory", {
		alias: "d",
		describe: "The directory path to watch",
		string: true,
		demandOption: true,
		coerce: resolve,
	})
	.option("key", {
		alias: "k",
		describe: "The encryption key",
		string: true,
		demandOption: true,
	})
	.option("program", {
		alias: "p",
		describe: "Program name to use for encrypting files",
		string: true,
		default: "xor",
	}).argv;

const ac = new AbortController();

process.on("SIGINT", () => {
	console.error("Captured SIGINT");
	ac.abort();
});

try {
	const watcher = watch(directory, { signal: ac.signal });
	console.log(`watching dir: ${directory}`);

	for await (const event of watcher) {
		console.log(event);

		if (
			event.filename.endsWith(`.${program}`) ||
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

		console.log(`spawning child process to encrypt file ${fileName}`);

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
	if (err?.name === "AbortError") console.log("aborted");
	else throw new Error(err);
}
