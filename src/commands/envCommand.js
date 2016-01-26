import _ from "lodash"

export default function(callback) {
  return function(config, options) {
    const environment = _.chain(config.environments)
      .find(["name", options["<environment>"]])
      .defaults({ protocol: "ssh", username: "dokku" })
      .value()

    const apps = _.chain(config.apps)
      .filter((app) => hasBeenSelected(app, options["<app>"]))
      .filter((app) => shouldBeDeployed(app, environment))
      .map((app) => configureAppForEnvironment(app, environment))
      .defaults({ config: {}, dockerOptions: {}, stopBeforeDeployment: false })
      .value()

    return callback(environment, apps)
  }
}

function hasBeenSelected(app, selectedApps) {
  if (_.isEmpty(selectedApps)) {
    return true
  } else {
    return _.includes(selectedApps, app.name)
  }
}

function shouldBeDeployed(app, environment) {
  if (app.environments) {
    return _.includes(app.environments, environment.name)
  } else {
    return true
  }
}

function configureAppForEnvironment(app, environment) {
  return Object.assign({}, app, {
    config: selectEnvironmentOptions(app.config, environment),
    dockerOptions: selectEnvironmentOptions(app.dockerOptions, environment)
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
