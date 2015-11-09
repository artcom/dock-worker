/* @flow */

import _ from "lodash"
import nodegit from "nodegit"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

import type {Config, Environment, Service, Services} from "./types"

export type Status = {
  name: string,
  status: string,
  version?: { expected: string, deployed: string },
  config?: { expected: Config, deployed: Config },
  dockerOptions?: { expected: Config, deployed: Config }
}

export type Action = {
  description: string,
  changes?: Array<Change>
}

export type Change = {
  type: string,
  key: string,
  oldValue?: any,
  value?: any
}

class Context {
  /* jscs:disable disallowSemicolons */
  environment: Environment;
  services: Services;
  available: Array<string>;

  dokku: Dokku;
  repoCache: RepoCache;
  /* jscs:enable disallowSemicolons */

  constructor(environment, services) {
    this.environment = environment
    this.services = services.filter((service) => _.contains(service.environments, environment.name))

    this.dokku = new Dokku(environment.host)
    this.repoCache = new RepoCache()
  }

  definedServiceStatus(service): Promise<Status> {
    if (_.includes(this.available, service.name)) {
      return Promise.all([
        this.deployedVersion(service),
        this.dokku.config(service.name),
        this.dokku.dockerOptions(service.name)
      ]).then(([version, config, dockerOptions]: [string, Config, Config]) => {
        return {
          name: service.name,
          status: "deployed",
          version: {
            deployed: version,
            expected: service.version
          },
          config: {
            deployed: config,
            expected: service.config || {}
          },
          dockerOptions: {
            deployed: dockerOptions,
            expected: service.dockerOptions || {}
          }
        }
      })
    } else {
      return Promise.resolve({
        name: service.name,
        status: "missing"
      })
    }
  }

  deployedVersion(service: Service): Promise<string> {
    return this.repoCache.getRepo(service, this.environment)
      .then((repo) => {
        return nodegit.Reference.lookup(repo, `refs/remotes/${this.environment.name}/master`)
      })
      .then((reference) => {
        return reference.target().toString()
      })
  }

  additionalServiceStatus(name: string): Promise<Status> {
    return Promise.resolve({
      name,
      status: "additional"
    })
  }
}

export function determine(environment: Environment, services: Services): Promise<Array<Status>> {
  const context = new Context(environment, services)

  return context.dokku.apps().then((available) => {
    context.available = available

    const deployedAndMissing = context.services
      .map((service) => context.definedServiceStatus(service))

    const defined = _.map(context.services, "name")
    const additional = _.difference(available, defined)
      .map((name) => context.additionalServiceStatus(name))

    return Promise.all(deployedAndMissing.concat(additional))
      .then((statusData) => _.sortBy(statusData, "name"))
  })
}

export function computeActions(app: Status): Array<Action> {
  const actions = []

  if (app.status === "missing") {
    actions.push({
      description: `Deploy ${app.name}`
    })
  } else if (app.status === "deployed") {
    if (app.version && app.version.expected !== app.version.deployed) {
      actions.push({
        description: `Update ${app.name}`
      })
    }

    if (app.config && !_.isEqual(app.config.expected, app.config.deployed)) {
      actions.push({
        description: `Configure ${app.name}`,
        changes: diffObjects(app.config.deployed, app.config.expected)
      })
    }

    if (app.dockerOptions && !_.isEqual(app.dockerOptions.expected, app.dockerOptions.deployed)) {
      actions.push({
        description: `Set Docker Options ${app.name}`,
        changes: diffObjects(app.dockerOptions.deployed, app.dockerOptions.expected)
      })
    }
  }

  return actions
}

function diffObjects(deployed: Config, expected: Config): Array<Change> {
  const {existing, missing, additional} = diffKeys(Object.keys(deployed), Object.keys(expected))

  return _(existing)
    .reject((key) => _.isEqual(deployed[key], expected[key]))
    .map((key) => ({
      type: "change",
      key,
      oldValue: deployed[key],
      value: expected[key]
    }))
    .concat(missing.map((key) => ({
      type: "add",
      key,
      value: expected[key]
    })))
    .concat(additional.map((key) => ({
      type: "remove",
      key,
      oldValue: deployed[key]
    })))
    .flatten()
    .value()
}

function diffKeys(deployed: Array<string>, expected: Array<string>) {
  return {
    existing: _.intersection(deployed, expected),
    missing: _.difference(expected, deployed),
    additional: _.difference(deployed, expected)
  }
}
