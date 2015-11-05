import _ from "lodash"

import RepoCache from "../repoCache"

export default function(callback) {
  return function({environments, services}, options) {
    const environment = _.find(environments, "name", options["<environment>"])

    return callback(
      environment,
      services.filter((service) => _.contains(service.environments, environment.name)),
      new RepoCache(".cache")
    )
  }
}
