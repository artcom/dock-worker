import bluebird from "bluebird"
import fs from "fs"
import path from "path"

const readFileAsync = bluebird.promisify(fs.readFile)

export default function() {
  return readFileAsync(path.join(__dirname, "../../package.json"))
    .then(JSON.parse)
    .then((pkg) => console.log(pkg.version))
}
