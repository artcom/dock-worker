import bluebird from "bluebird"
import fs from "fs"
import jju from "jju"

const readFileAsync = bluebird.promisify(fs.readFile)
const writeFileAsync = bluebird.promisify(fs.writeFile)

export async function readDockfile(options) {
  const file = filename(options)

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

export async function updateDockfile(dockfile, options) {
  const file = filename(options)

  try {
    const json = await readFileAsync(file)
    const updatedJson = jju.update(json, dockfile, { mode: "json" })
    await writeFileAsync(file, updatedJson)
  } catch (error) {
    throw new Error(`Could not write ${file}`)
  }
}

function filename(options) {
  return options["--file"]
}
