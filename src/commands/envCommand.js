import _ from "lodash"

export default function(callback) {
  return function({environments, services}, options) {
    const environment = _.find(environments, "name", options["<environment>"])
    const selectedApps = options["<app>"]

    return callback(
      _.defaults(environment, { protocol: "ssh", username: "dokku" }),
      services
        .filter((service) => hasBeenSelected(service, selectedApps))
        .filter((service) => shouldBeDeployed(service, environment))
        .map((service) => configureServiceForEnvironment(service, environment))
    )
  }
}

function hasBeenSelected(service, selectedApps) {
  if (_.isEmpty(selectedApps)) {
    return true
  } else {
    return _.includes(selectedApps, service.name)
  }
}

function shouldBeDeployed(service, environment) {
  if (service.environments) {
    return _.includes(service.environments, environment.name)
  } else {
    return true
  }
}

function configureServiceForEnvironment(service, environment) {
  return Object.assign({}, service, {
    config: selectEnvironmentOptions(service.config, environment),
    dockerOptions: selectEnvironmentOptions(service.dockerOptions, environment)
  })
}

function selectEnvironmentOptions(options, environment) {
  return _(options)
    .mapValues((value) => {
      if (_.isPlainObject(value)) {
        return value[environment.name]
      } else {
        return value
      }
    })
    .omit(_.isUndefined)
    .value()
}
