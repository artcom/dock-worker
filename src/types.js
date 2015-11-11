/* @flow */

export type Environment = { name: string, host: string, protocol: string, username: string }

export type Options = {[key: string]: string}

export type ServiceConfig = {
  name: string,
  repo: string,
  version: string,
  environments: Array<string>,
  config?: Options,
  dockerOptions?: Options,
  stopBeforeDeployment?: boolean
}

export type ServiceConfigs = Array<ServiceConfig>
