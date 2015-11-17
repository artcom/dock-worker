/* @flow */

export type Environment = { name: string, host: string, protocol: string, username: string }

export type Options = {[key: string]: string}

export type AppConfig = {
  name: string,
  repo: string,
  version: string,
  config: Options,
  dockerOptions: Options,
  stopBeforeDeployment: boolean
}
