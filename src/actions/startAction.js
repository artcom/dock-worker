/* @flow */

import Dokku from "../dokku"

import type { AppData } from "../appData"

export function needsStartAction(app: AppData, actions: Array<*>): boolean {
  return !app.running && actions.length === 0
}

export function makeStartAction(app: AppData): ?StartAction {
  return new StartAction(app)
}

export function isStartAction(action: any): boolean {
  return action instanceof StartAction
}

class StartAction {
  name: string;

  constructor({ name }: AppData) {
    this.name = name
  }

  describe(): Array<string> {
    return [`start ${this.name}`]
  }

  run(dokku: Dokku): Promise<> {
    return dokku.start(this.name)
  }
}
