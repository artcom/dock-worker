import _ from "lodash"

import Dokku from "./dokku"

export function determine(environment, services, repoCache) {
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

    function version(service) {
      if (service) {
        return repoCache.getRepo(service)
          .then((repo) => repo.getMasterCommit())
          .then((commit) => commit.sha())
      } else {
        return Promise.resolve("")
      }
    }

    return Promise.all(apps.map((app) => {
      const service = _.find(services, "name", app)

      return version(service).then((v) => ({
        name: app,
        config: service,
        status: status(app),
        version: v
      }))
    }))
  })
}
