import _ from "lodash"
import bluebird from "bluebird"
import cp from "child_process"

const execFileAsync = bluebird.promisify(cp.execFile)

export default class {
  constructor(host) {
    this.host = host
  }

  apps() {
    return this.dokku("apps").then((stdout) =>
      _(stdout)
        .split("\n")
        .reject(unnecessaryLine)
        .value()
    )
  }

  config(app) {
    return this.dokku("config", app).then((stdout) =>
      _(stdout)
        .split("\n")
        .reject(unnecessaryLine)
        .map(extractPair)
        .reject(dokkuConfig)
        .zipObject()
        .value()
    )
  }

  // PRIVATE

  dokku(...params) {
    return execFileAsync("ssh", [`dokku@${this.host}`].concat(params))
  }
}

function unnecessaryLine(line) {
  return line === "" || line.startsWith("=====>")
}

function extractPair(line) {
  const [key, value] = line.split(":")
  return [key, _.trim(value)]
}

function dokkuConfig(pair) {
  return pair[0].startsWith("DOKKU_")
}
