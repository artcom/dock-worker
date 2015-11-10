/* @flow */

import colors from "colors/safe"

import type {AppData} from "../appData"
import type {Environment} from "../types"

export default class {
  /* jscs:disable disallowSemicolons */
  app: AppData;
  /* jscs:enable disallowSemicolons */

  constructor(app: AppData) {
    this.app = app
  }

  describe(): Array<string> {
    return [colors.cyan(`deploy ${this.config.version}`)]
  }

  run(environment: Environment): Promise {
    return Promise.resolve()
  }
}
