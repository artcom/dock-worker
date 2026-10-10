import fs from "fs"
import path from "path"
import { promisify } from "util"

const readFileAsync = promisify(fs.readFile)

export default async function version() {
  const json = await readFileAsync(
    path.join(import.meta.dirname, "../../package.json"),
  )
  const pkg = JSON.parse(json.toString())
  console.log(pkg.version)
}
