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
  connection: SshConnection;
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
    return this.dokku("apps:list").then(filterRelevantLines)
  }

  async ls(): Promise<Array<AppStatus>> {
    const fullReport = await this.dokku("ps:report")
    const reports = extractReports(fullReport)
    const status = reports.map(extractStatus)
    return status
  }

  create(app: string): Promise<String[]> {
    return this.dokku("apps:create", app).then(filterRelevantLines)
  }

  config(app: string): Promise<Options> {
    return this.dokku("config", app)
      .catch(error => {
        if (error.message.endsWith(`app ${app} does not exist: <nil>`)) {
          return ""
        } else {
          throw error
        }
      })
      .then(filterRelevantLines)
      .then((lines: String[]) => {
        const pairs = lines.map(extractPair)
        return fromPairs(pairs)
      })
  }

  setConfig(app: string, config: { [key: string]: string }): Promise<Array<string>> {
    const params = map(config, (value, key) => `${key}="${value}"`)
    return this.dokku("config:set", app, ...params).then(filterRelevantLines)
  }

  unsetConfig(app: string, ...keys: Array<string>): Promise<Array<string>> {
    return this.dokku("config:unset", app, ...keys).then(filterRelevantLines)
  }

  dockerOptions(app: string): Promise<Options> {
    return this.dokku("docker-options", app).then(filterRelevantLines).then(lines =>
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
    return this.dokku("docker-options:add", app, phases.join(","), option)
      .then(filterRelevantLines)
  }

  removeDockerOption(app: string, option: string, phases: Array<Phase>): Promise<Array<string>> {
    return this.dokku("docker-options:remove", app, phases.join(","), option)
      .then(filterRelevantLines)
  }

  stop(app: string): Promise<Array<string> | void> {
    return this.dokku("ps:stop", app).then(filterRelevantLines).catch(error => {
      if (!error.message.endsWith(`App ${app} has not been deployed\n`)) {
        throw error
      }
    })
  }

  start(app: string): Promise<Array<string>> {
    return this.dokku("ps:start", app).then(filterRelevantLines)
  }

  restart(app: string): Promise<Array<string>> {
    return this.dokku("ps:restart", app).then(filterRelevantLines)
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

function filterRelevantLines(stdout: string): Array<string> {
  const lines = stdout.split("\n")
  return lines.filter(isRelevantLine)
}

function isRelevantLine(line: string) {
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
  const status = lines[lines.length - 1].split(/\s+/)[2]
  return { name, status }
}

function extractPair(line: string): [string, string] {
  const tokens = line.split(":")
  return [tokens[0], tokens.slice(1).join(":").trim()]
}

const phaseLine = /^(Build|Deploy|Run) options/
