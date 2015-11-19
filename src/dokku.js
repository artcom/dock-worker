/* @flow */

import _ from "lodash"
import bluebird from "bluebird"
import cp from "child_process"

import type {Environment, Options} from "./types"

const execFileAsync = bluebird.promisify(cp.execFile)

export type Phase = "build" | "deploy" | "run"

export default class {
  /* jscs:disable disallowSemicolons */
  host: string;
  username: string;
  /* jscs:enable disallowSemicolons */

  constructor({host, username}: Environment) {
    this.host = host
    this.username = username
  }

  apps(): Promise<Array<string>> {
    return this.dokku("apps")
  }

  create(app: string): Promise {
    return this.dokku("apps:create", app)
  }

  config(app: string): Promise<Options> {
    return this.dokku("config", app).catch((error) => {
      if (error.message.endsWith(`no config vars for ${app}\n`)) {
        return []
      } else {
        throw error
      }
    }).then((lines) =>
      _.chain(lines)
        .map(extractPair)
        .reject(isDokkuConfig)
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

  dockerOptions(app: string): Promise<Options> {
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

  stop(app: string): Promise {
    return this.dokku("ps:stop", app)
  }

  // PRIVATE

  dokku(...params: Array<string>): Promise<Array<string>> {
    return execFileAsync("ssh", [`${this.username}@${this.host}`].concat(params)).then((stdout) => {
      const lines = stdout.split("\n")
      return _.reject(lines, unnecessaryLine)
    })
  }
}

function unnecessaryLine(line) {
  return line === "" || line.startsWith("=====>")
}

function extractPair(line) {
  const tokens = line.split(":")
  return [_.first(tokens), _.trim(_.rest(tokens).join(":"))]
}

function isDokkuConfig(pair) {
  return pair[0].startsWith("DOKKU_")
}

const phaseLine = /^(Build|Deploy|Run) options/
