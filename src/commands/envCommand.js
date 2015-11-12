import _ from "lodash"

export default function(callback) {
  return function({environments, services}, options) {
    const environment = _.find(environments, "name", options["<environment>"])

    return callback(
      _.defaults(environment, { protocol: "ssh", username: "dokku" }),
      services.map((service) => configureServiceForEnvironment(service, environment))
    )
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
