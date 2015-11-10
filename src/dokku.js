/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import cp from "child_process"

import type {Config} from "./types"

const execFileAsync = bluebird.promisify(cp.execFile)

export type Phase = "build" | "deploy" | "run"

export default class {
  /* jscs:disable disallowSemicolons */
  host: string;
  /* jscs:enable disallowSemicolons */

  constructor(host: string) {
    this.host = host
  }

  apps(): Promise<Array<string>> {
    return this.dokku("apps")
  }

  config(app: string): Promise<Config> {
    return this.dokku("config", app).then((lines) =>
      _(lines)
        .map(extractPair)
        .reject(dokkuConfig)
        .zipObject()
        .value()
    )
  }

  setConfig(app: string, key: string, value: string): Promise {
    return this.dokku("config:set", app, `${key}="${value}"`)
  }

  unsetConfig(app: string, key: string): Promise {
    return this.dokku("config:unset", app, key)
  }

  dockerOptions(app: string): Promise<Config> {
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

  addDockerOption(app: string, option: string, phases: Array<Phase>): Promise {
    return this.dokku("docker-options:add", app, phases.join(","), option)
  }

  removeDockerOption(app: string, option: string, phases: Array<Phase>): Promise {
    return this.dokku("docker-options:remove", app, phases.join(","), option)
  }

  // PRIVATE

  dokku(...params: Array<string>): Promise<Array<string>> {
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
