import _ from "lodash"
import bluebird from "bluebird"
import cp from "child_process"

const execFileAsync = bluebird.promisify(cp.execFile)

export default class {
  constructor(host) {
    this.host = host
  }

  apps() {
    return this.dokku("apps")
  }

  config(app) {
    return this.dokku("config", app).then((lines) =>
      _(lines)
        .map(extractPair)
        .reject(dokkuConfig)
        .zipObject()
        .value()
    )
  }

  dockerOptions(app) {
    return this.dokku("docker-options", app).then((lines) =>
      lines.reduce(({options, phase}, line) => {
        const match = line.match(phaseLine)

        if (match) {
          return { options, phase: match[1].toLowerCase() }
        } else {
          const option = _.trim(line)
          const phases = options[option] || []
          options[option] = _.union(phases, [phase])

          return { options, phase }
        }
      }, { options: {}, phase: null }).options
    )
  }

  // PRIVATE

  dokku(...params) {
    return execFileAsync("ssh", [`dokku@${this.host}`].concat(params)).then((stdout) => {
      const lines = stdout.split("\n")
      return _.reject(lines, unnecessaryLine)
    })
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

const phaseLine = /^(Build|Deploy|Run) options/
