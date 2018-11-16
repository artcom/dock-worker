export type Options = {[key: string]: string}

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
  environments: [environment],
  apps: [AppDescription]
}

export type environment = {
  name: string,
  host: string
}
