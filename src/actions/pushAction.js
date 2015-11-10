/* @flow */

import colors from "colors/safe"

import type {Status} from "../status"
import type {Environment} from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  app: Status;
  /* jscs:enable disallowSemicolons */

  constructor(app: Status) {
    this.app = app
  }

  describe(): Array<string> {
    return [colors.cyan(`Deploy ${this.app.version.expected}`)]
  }

  run(environment: Environment): Promise {
    return Promise.resolve()
  }
}
