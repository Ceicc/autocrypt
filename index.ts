import { watch } from "node:fs/promises"
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const currenDir = dirname(fileURLToPath(import.meta.url))
const ac = new AbortController()

process.on('SIGINT', () => {
	console.error("Captured SIGINT")
	ac.abort()
})

try {
	const watcher = watch(currenDir, { signal: ac.signal });
	console.log(`watching dir: ${currenDir}`)

	for await (const event of watcher)
		console.log(event);

} catch (err: any) {
	if (err?.name === 'AbortError')
		console.log("aborted")
	else
		throw err;
}
