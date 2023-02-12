import { resolve } from "node:path";
import process from "node:process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import autocrypt from "./index.js";

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

console.log(`watching dir: ${directory}`);

autocrypt({
	directory,
	key,
	program,
	signal: ac.signal,
	onDetectFile(fileName) {
		console.log(`spawning child process to encrypt file ${fileName}`);
	},
});
