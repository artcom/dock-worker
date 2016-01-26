/* @flow */

import Dokku from "../dokku"

import type {AppData} from "../appData"

export default class {
  /* jscs:disable disallowSemicolons */
  name: string;
  /* jscs:enable disallowSemicolons */

  constructor({ name }: AppData) {
    this.name = name
  }

  describe(): Array<string> {
    return [`start ${this.name}`]
  }

  run(dokku: Dokku): Promise {
    return dokku.start(this.name)
  }
}