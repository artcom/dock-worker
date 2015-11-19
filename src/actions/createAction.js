/* @flow */

import Dokku from "../dokku"

import type {AppData} from "../appData"
import type {Environment} from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  name: string;
  /* jscs:enable disallowSemicolons */

  constructor(app: AppData) {
    this.name = app.name
  }

  describe(): Array<string> {
    return [`create ${this.name}`]
  }

  run(environment: Environment): Promise {
    const dokku = new Dokku(environment)
    return dokku.create(this.name)
  }
}
