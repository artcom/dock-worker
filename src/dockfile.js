import bluebird from "bluebird"
import fs from "fs"

const readFileAsync = bluebird.promisify(fs.readFile)

export async function readDockfile(file) {
  try {
    const content = await readFileAsync(file)
    return JSON.parse(content)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Syntax error in ${file}: ${error.message}`)
    } else {
      throw new Error(`Could not read ${file}`)
    }
  }
}
