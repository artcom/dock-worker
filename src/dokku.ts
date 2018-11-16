import fromPairs from "lodash/fromPairs"
import map from "lodash/map"
import union from "lodash/union"

import SshConnection from "./sshConnection"

import { Options } from "./types"
 
export type Phase = "build" | "deploy" | "run"
export type AppStatus = {
  name: string,
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
    return this.dokku("apps:list").then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    })
  }

  async ls(): Promise<Array<AppStatus>> {
    const fullReport = await this.dokku("ps:report")
    const reports = extractReports(fullReport)
    const status = reports.map(extractStatus)
    return status
  }

  create(app: string): Promise<Array<string>> {
    return this.dokku("apps:create", app).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    })
  }

  config(app: string): Promise<Options> {
    return this.dokku("config", app).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    }).then(lines => {
      const pairs = lines.map(extractPair)
      return fromPairs(pairs)
    })
  }

  setConfig(app: string, config: { [key: string]: string }): Promise<Array<string>> {
    const params = map(config, (value, key) => `${key}="${value}"`)
    return this.dokku("config:set", app, ...params).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    })
  }

  unsetConfig(app: string, ...keys: Array<string>): Promise<Array<string>> {
    return this.dokku("config:unset", app, ...keys).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    })
  }

  dockerOptions(app: string): Promise<Options> {
    return this.dokku("docker-options", app).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    }).then(lines =>
      lines.reduce(({ options, phase }, line) => {
        const match = line.match(phaseLine)

        if (match) {
          return { options, phase: match[1].toLowerCase() }
        } else {
          const option = line.trim()
          const phases = options[option] || []
          options[option] = union(phases, [phase])

          return { options, phase }
        }
      }, { options: {}, phase: null }).options
    )
  }

  addDockerOption(app: string, option: string, phases: Array<Phase>): Promise<Array<string>> {
    return this.dokku("docker-options:add", app, phases.join(","), option).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    })
  }

  removeDockerOption(app: string, option: string, phases: Array<Phase>): Promise<Array<string>> {
    return this.dokku("docker-options:remove", app, phases.join(","), option).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    })
  }

  stop(app: string): Promise<Array<string> | void> {
    return this.dokku("ps:stop", app).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    }).catch(error => {
      if (!error.message.endsWith(`App ${app} has not been deployed\n`)) {
        throw error
      }
    })
  }

  start(app: string): Promise<Array<string>> {
    return this.dokku("ps:start", app).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    })
  }

  restart(app: string): Promise<Array<string>> {
    return this.dokku("ps:restart", app).then(stdout => {
      const lines = stdout.split("\n")
      return lines.filter(isRelevantLine)
    })
  }

  // PRIVATE

  dokku(...params: Array<string>): Promise<string> {
    return this.sendCommand(params.join(" "))
  }

  sendCommand(command: string): Promise<string> {
    if (!this.connection) {
      this.connection = new SshConnection(this.username, this.host)
    }

    return this.connection.exec(command)
  }
}

function isRelevantLine(line) {
  return line !== "" && !line.startsWith("=====>") && !line.startsWith("----->")
}

function extractReports(reportList: string): Array<string> {
  return reportList
    .split("=====>")
    .filter(report => report !== "")
}

function extractStatus(report: string): AppStatus {
  const lines = report
    .split("\n")
    .filter(report => report !== "")
    .map(line => line.trim())

    const nameRegEx = /^\S+/

    const name = nameRegEx.exec(lines[0])[0]
    const status = lines[lines.length-1].split(/\s+/)[2]
    return { name, status }
}

function extractPair(line: string) {
  const tokens = line.split(":")
  return [tokens[0], tokens.slice(1).join(":").trim()]
}

const phaseLine = /^(Build|Deploy|Run) options/
