import { Dictionary } from "lodash"

export type Options = Dictionary<{} | string>

export type AppDescription = {
  name: string,
  repo: string,
  version: string,
  environments: Array<string>,
  config: Options,
  dockerOptions: Options,
  stopBeforeDeployment: boolean
}

export type Dockfile = {
  environments: [Environment],
  apps: [AppDescription]
}

export type Environment = {
  name: string,
  host: string
}
