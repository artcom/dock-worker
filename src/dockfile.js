import bluebird from "bluebird"
import fs from "fs"
import os from "os"

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

export async function writeDockfile(dockfile, options) {
  const file = filename(options)

  try {
    await writeFileAsync(file, [JSON.stringify(dockfile, null, 2), ""].join(os.EOL))
  } catch (error) {
    throw new Error(`Could not write ${file}`)
  }
}

function filename(options) {
  return options["--file"]
}
