import { createReadStream, createWriteStream, rm } from "node:fs";
import { spawn } from "node:child_process";
import { watch } from "chokidar";

type AutocryptOptions = {
	directory: string;
	key: string;
	program?: string;
	signal?: AbortSignal;
	onDetectFile?: (fileName: string) => void;
};

export default async function autocrypt({
	directory,
	key,
	program = "xor",
	signal = new AbortController().signal,
	onDetectFile = () => undefined,
}: AutocryptOptions) {
	const watcher = watch(directory, {
		ignored: [new RegExp(`.${program}$`), /\.crdownload$/],
	});

	signal.addEventListener("abort", watcher.close.bind(watcher));

	watcher.on("add", (fileName) => {
		onDetectFile(fileName);
		const child = spawn(program, [key], {
			stdio: ["pipe", "pipe", "inherit"],
		});

		createReadStream(fileName).pipe(child.stdin);
		child.stdout.pipe(createWriteStream(`${fileName}.${program}`));

		child.on("close", () => {
			rm(fileName, (err) => {
				if (err) {
					console.error(err);
				}
			});
		});
	});
}
