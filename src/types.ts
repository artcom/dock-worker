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
