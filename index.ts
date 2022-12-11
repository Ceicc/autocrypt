import { watch, stat } from "node:fs/promises"
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createReadStream, createWriteStream } from "node:fs";
import { spawn } from "node:child_process";

const currenDir = dirname(fileURLToPath(import.meta.url))
const encryptionKey = 'test'
const ac = new AbortController()

process.on('SIGINT', () => {
	console.error("Captured SIGINT")
	ac.abort()
})

try {
	const watcher = watch(currenDir, { signal: ac.signal });
	console.log(`watching dir: ${currenDir}`)

	for await (const event of watcher) {
		console.log(event);

		if (event.filename.endsWith('.xor') || event.eventType === "change") {
			continue
		}

		const fileName = resolve(currenDir, event.filename)

		let fileStat
		try {
			fileStat = await stat(fileName)
		} catch (error: any) {
			if (error.code === "ENOENT")
				continue
			else
				throw error
		}

		if (fileStat.isDirectory()) {
			console.error(`${fileName}: Cannot watch events on nested directories`)
			continue
		}

		if (!fileStat.isFile()) {
			console.error(`${fileName}: Unknown file type`)
			continue
		}

		console.log(`spawning child process to encrypt file ${fileName}`)

		const xorProcessor = spawn('xor', [encryptionKey], {
			stdio: [
				'pipe',
				'pipe',
				'inherit',
			] 
		})

		createReadStream(fileName).pipe(xorProcessor.stdin)
		xorProcessor.stdout.pipe(createWriteStream(`${fileName}.xor`))

		xorProcessor.on('close', () => {
			// remove original file
			spawn('rm', [fileName])
		})


	}

} catch (err: any) {
	if (err?.name === 'AbortError')
		console.log("aborted")
	else
		throw err;
}
