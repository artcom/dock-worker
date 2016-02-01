/* @flow */

export type Options = {[key: string]: string}

export type AppConfig = {
  name: string,
  repo: string,
  version: string,
  config: Options,
  dockerOptions: Options,
  stopBeforeDeployment: boolean
}
