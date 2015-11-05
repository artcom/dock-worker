import _ from "lodash"
import nodegit from "nodegit"

import Dokku from "./dokku"
import RepoCache from "./repoCache"

export function determine(environment, services) {
  const dokku = new Dokku(environment.host)
  return dokku.apps().then(function(available) {
    const defined = _.map(services, "name")

    const apps = _.union(defined, available).sort()
    const deployed = _.intersection(defined, available)
    const additional = _.difference(available, defined)
    const missing = _.difference(defined, available)

    function status(app) {
      if (_.includes(deployed, app)) {
        return "deployed"
      } else if (_.includes(additional, app)) {
        return "additional"
      } else if (_.includes(missing, app)) {
        return "missing"
      } else {
        return "unknown"
      }
    }

    const repoCache = new RepoCache()

    function lookUpVersion(service) {
      if (service) {
        return repoCache.getRepo(service, environment)
          .then((repo) => {
            return nodegit.Reference.lookup(repo, `refs/remotes/${environment.name}/master`)
          })
          .then((reference) => {
            return reference.target().toString()
          })
      } else {
        return Promise.resolve()
      }
    }

    return Promise.all(apps.map((app) => {
      const service = _.find(services, "name", app)

      return lookUpVersion(service).then((deployedVersion) => ({
        name: app,
        status: status(app),
        deployedVersion,
        expectedVersion: service && service.version
      }))
    }))
  })
}
