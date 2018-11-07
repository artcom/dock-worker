import bluebird from "bluebird"
import fs from "fs"
import path from "path"

const readFileAsync = bluebird.promisify(fs.readFile)

export default async function() {
  const json = await readFileAsync(path.join(__dirname, "../../package.json"))
  const pkg = JSON.parse(json.toString())
  console.log(pkg.version)
}
