import _ from "lodash"
import nodegit from "nodegit"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

class Context {
  constructor(environment, services) {
    this.environment = environment
    this.services = services.filter((service) => _.contains(service.environments, environment.name))

    this.dokku = new Dokku(environment.host)
    this.repoCache = new RepoCache()
  }

  definedServiceStatus(service) {
    if (_.includes(this.available, service.name)) {
      return Promise.all([
        this.deployedVersion(service),
        this.dokku.config(service.name)
      ]).then(([deployedVersion, deployedConfig]) => {
        return {
          name: service.name,
          status: "deployed",
          deployed: {
            version: deployedVersion,
            config: deployedConfig
          },
          expected: {
            version: service.version,
            config: service.config
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

  deployedVersion(service) {
    return this.repoCache.getRepo(service, this.environment)
      .then((repo) => {
        return nodegit.Reference.lookup(repo, `refs/remotes/${this.environment.name}/master`)
      })
      .then((reference) => {
        return reference.target().toString()
      })
  }

  additionalServiceStatus(name) {
    return Promise.resolve({
      name,
      status: "additional"
    })
  }
}

export function determine(environment, services) {
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

export function deriveActions(status) {
  return status.reduce(function(actions, app) {
    if (app.status === "missing") {
      actions.push({ description: `Deploy ${app.name}` })
    } else if (app.status === "deployed" && app.expected.version !== app.deployed.version) {
      actions.push({ description: `Update ${app.name}` })
    }

    return actions
  }, [])
}
