import _ from "lodash"

export default function(callback) {
  return function({environments, services}, options) {
    const environment = _.find(environments, "name", options["<environment>"])

    return callback(
      _.defaults(environment, { protocol: "ssh", username: "dokku" }),
      services.filter((service) => _.contains(service.environments, environment.name))
    )
  }
}
