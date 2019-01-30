import fromPairs from "lodash/fromPairs"
import map from "lodash/map"
import union from "lodash/union"

import SshConnection from "./sshConnection"

import { Options } from "./types"

export type Phase = "build" | "deploy" | "run"
export type AppStatus = {
  name: string,
  deployed: boolean,
  running: boolean
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

  apps(): Promise<string[]> {
    return this.dokku("apps:list").then(filterRelevantLines)
  }

  async report(): Promise<AppStatus[]> {
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

  setConfig(app: string, config: { [key: string]: string }): Promise<string[]> {
    const params = map(config, (value, key) => `${key}="${value}"`)
    return this.dokku("config:set", app, ...params).then(filterRelevantLines)
  }

  unsetConfig(app: string, ...keys: string[]): Promise<string[]> {
    return this.dokku("config:unset", app, ...keys).then(filterRelevantLines)
  }

  dockerOptions(app: string): Promise<Options> {
    return this.dokku("docker-options:report", app)
      .then(filterRelevantLines)
      .then(extractDockerOptions)
  }

  addDockerOption(app: string, option: string, phases: Phase[]): Promise<string[]> {
    return this.dokku("docker-options:add", app, phases.join(","), option)
      .then(filterRelevantLines)
  }

  removeDockerOption(app: string, option: string, phases: Phase[]): Promise<string[]> {
    return this.dokku("docker-options:remove", app, phases.join(","), option)
      .then(filterRelevantLines)
  }

  stop(app: string): Promise<string[] | void> {
    return this.dokku("ps:stop", app).then(filterRelevantLines).catch(error => {
      if (!error.message.endsWith(`App ${app} has not been deployed\n`)) {
        throw error
      }
    })
  }

  start(app: string): Promise<string[]> {
    return this.dokku("ps:start", app).then(filterRelevantLines)
  }

  restart(app: string): Promise<string[]> {
    return this.dokku("ps:restart", app).then(filterRelevantLines)
  }

  // PRIVATE

  dokku(...params: string[]): Promise<string> {
    return this.sendCommand(params.join(" "))
  }

  sendCommand(command: string): Promise<string> {
    if (!this.connection) {
      this.connection = new SshConnection(this.username, this.host)
    }

    return this.connection.exec(command)
  }
}

function filterRelevantLines(stdout: string): string[] {
  const lines = stdout.split("\n")
  return lines.filter(isRelevantLine)
}

function isRelevantLine(line: string) {
  return line !== "" && !line.startsWith("=====>") && !line.startsWith("----->")
}

function extractReports(reportList: string): string[] {
  return reportList
    .split("=====>")
    .filter(report => report !== "")
}

function extractStatus(report: string): AppStatus {
  const nameRegEx = /\S+/
  const deployedRegEx = /Deployed:\s+(\S+)/
  const runningRegEx = /Running:\s+(\S+)/

  const name = nameRegEx.exec(report)[0]
  const deployed = deployedRegEx.exec(report)[1] === "true"
  const running = runningRegEx.exec(report)[1] === "true"
  return { name, deployed, running }
}

function extractPair(line: string): [string, string] {
  const tokens = line.split(":")
  return [tokens[0], tokens.slice(1).join(":").trim()]
}

function extractDockerOptions(lines) {
  const options = {};
  ["build", "deploy", "run"].forEach((phase, index) => {
    const phaseOptions = extractPhaseOptions(lines[index])
    phaseOptions.forEach(option => {
      const phases = options[option] || []
      options[option] = union(phases, [phase])
    })
  })

  return options
}

function extractPhaseOptions(line) {
  const options = line.trim().split(" -")
  options.shift()
  return options
    .map(option => `-${option}`)
    .filter(ignoreDefaultDockerOptions)
}

function ignoreDefaultDockerOptions(option) {
  return option !== "--restart=on-failure:10"
}
