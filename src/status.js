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
        this.dokku.config(service.name),
        this.dokku.dockerOptions(service.name)
      ]).then(([deployedVersion, deployedConfig, deployedDockerOptions]) => {
        return {
          name: service.name,
          status: "deployed",
          deployed: {
            version: deployedVersion,
            config: deployedConfig,
            dockerOptions: deployedDockerOptions
          },
          expected: {
            version: service.version,
            config: service.config || {},
            dockerOptions: service.dockerOptions || {}
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

export function computeActions(app) {
  const actions = []

  if (app.status === "missing") {
    actions.push({
      type: `Deploy ${app.name}`
    })
  } else if (app.status === "deployed") {
    if (app.expected.version !== app.deployed.version) {
      actions.push({
        description: `Update ${app.name}`
      })
    }

    if (!_.isEqual(app.expected.config, app.deployed.config)) {
      actions.push({
        description: `Configure ${app.name}`,
        changes: diffObjects(app.deployed.config, app.expected.config)
      })
    }

    if (!_.isEqual(app.expected.dockerOptions, app.deployed.dockerOptions)) {
      actions.push({
        description: `Set Docker Options ${app.name}`,
        changes: diffObjects(app.deployed.dockerOptions, app.expected.dockerOptions)
      })
    }
  }

  return actions
}

function diffObjects(deployed, expected) {
  const {existing, missing, additional} = diffKeys(_.keys(deployed), _.keys(expected))

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

function diffKeys(deployed, expected) {
  return {
    existing: _.intersection(deployed, expected),
    missing: _.difference(expected, deployed),
    additional: _.difference(deployed, expected)
  }
}
