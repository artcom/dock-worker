/* @flow */

export type Environment = { name: string, host: string, protocol: string, username: string }

export type Config = {[key: string]: string}

export type Service = {
  name: string,
  repo: string,
  version: string,
  environments: Array<string>,
  config?: Config,
  dockerOptions?: Config
}

export type Services = Array<Service>
