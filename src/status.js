/* @flow */

import _ from "lodash"
import nodegit from "nodegit"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

import type {Config, Environment, Service, Services} from "./types"

export type Status = DeployedStatus | MissingStatus | AdditionalStatus

type DeployedStatus = {
  type: "deployed",
  name: string,
  version: { expected: string, deployed: string },
  config: { expected: Config, deployed: Config },
  dockerOptions: { expected: Config, deployed: Config }
}

type MissingStatus = { type: "missing", name: string }
type AdditionalStatus = { type: "additional", name: string }

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
          type: "deployed",
          name: service.name,
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
        type: "missing",
        name: service.name
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
      type: "additional",
      name
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
