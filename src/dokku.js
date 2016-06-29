/* @flow */

import _ from "lodash"

import SshConnection from "./sshConnection"

import type { Options } from "./types"

export type Phase = "build" | "deploy" | "run"
export type AppStatus = {
  name: string,
  type: string,
  id: string,
  status: string
}

export default class {
  connection: any;
  host: string;
  username: string;

  constructor(host: string, username: string = "dokku") {
    this.host = host
    this.username = username
  }

  disconnect() {
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
  }

  apps(): Promise<Array<string>> {
    return this.dokku("apps")
  }

  ls(): Promise<Array<AppStatus>> {
    return this.dokku("ls").then((lines) => lines.map(extractStatus))
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
        .fromPairs()
        .value()
    )
  }

  setConfig(app: string, config: { [key: string]: string }): Promise {
    const params = _.map(config, (value, key) => `${key}="${value}"`)
    return this.dokku("config:set", app, ...params)
  }

  unsetConfig(app: string, ...keys: Array<string>): Promise {
    return this.dokku("config:unset", app, ...keys)
  }

  dockerOptions(app: string): Promise<Options> {
    return this.dokku("docker-options", app).then((lines) =>
      lines.reduce(({ options, phase }, line) => {
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
    return this.dokku("ps:stop", app).catch((error) => {
      if (!error.message.endsWith(`App ${app} has not been deployed\n`)) {
        throw error
      }
    })
  }

  start(app: string): Promise {
    return this.dokku("ps:start", app)
  }

  restart(app: string): Promise {
    return this.dokku("ps:restart", app)
  }

  // PRIVATE

  dokku(...params: Array<string>): Promise<Array<string>> {
    return this.sendCommand(params.join(" ")).then((stdout) => {
      const lines = stdout.split("\n")
      return _.reject(lines, unnecessaryLine)
    })
  }

  sendCommand(command: string): Promise<string> {
    if (!this.connection) {
      this.connection = new SshConnection(this.username, this.host)
    }

    return this.connection.exec(command)
  }
}

function unnecessaryLine(line) {
  return line === "" || line.startsWith("=====>") || line.startsWith("----->")
}

function extractStatus(line) {
  const columns = line.split(/\s+/).filter((column) => column !== "")

  if (columns.length !== 4) {
    throw new Error(`unexpected Dokku output (${line})`)
  }

  const [name, type, id, status] = columns
  return { name, type, id, status }
}

function extractPair(line) {
  const tokens = line.split(":")
  return [_.head(tokens), _.trim(_.tail(tokens).join(":"))]
}

function isDokkuConfig(pair) {
  return pair[0].startsWith("DOKKU_")
}

const phaseLine = /^(Build|Deploy|Run) options/
