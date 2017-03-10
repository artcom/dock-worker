/* @flow */

import Dokku from "../dokku"

import type { AppData } from "../appData"

export function needsCreateAction(app: AppData): boolean {
  return app.status === "missing"
}

export function makeCreateAction(app: AppData): CreateAction {
  return new CreateAction(app)
}

export function isCreateAction(action: any): boolean {
  return action instanceof CreateAction
}

class CreateAction {
  name: string;

  constructor({ name }: AppData) {
    this.name = name
  }

  describe(): Array<string> {
    return [`create ${this.name}`]
  }

  run(dokku: Dokku): Promise<> {
    return dokku.create(this.name)
  }
}
