import chalk from "chalk"

import envCommand from "./envCommand"
import { AppDescription } from "../types"
import { lsRemote } from "../git"

const MAIN_REF = "refs/heads/main"

type AppWithMainRef = {
  appName: string
  dockfileVersion: string
  mainVersion: string
}

export default envCommand(outdated)

async function outdated(descriptions: Array<AppDescription>) {
  const appVersions = await Promise.all(descriptions.map(loadMainVersion))

  const outdatedApps = appVersions.filter(
    (app) => app.dockfileVersion !== app.mainVersion,
  )

  if (outdatedApps.length === 0) {
    console.log(chalk.green("all services are on the latest main commit"))
    return
  }

  console.log(chalk.red("services with outdated Dockfile commit:"))

  outdatedApps.forEach((app) => {
    console.log(chalk.bold(app.appName))
    console.log(`  dockfile: ${app.dockfileVersion}`)
    console.log(`  main:     ${app.mainVersion}`)
  })
}

async function loadMainVersion(app: AppDescription): Promise<AppWithMainRef> {
  const mainVersion = await lsRemote(app.repo, MAIN_REF)

  if (!mainVersion) {
    throw new Error(
      `Could not resolve ${MAIN_REF} for app "${app.name}" (${app.repo})`,
    )
  }

  return {
    appName: app.name,
    dockfileVersion: app.version,
    mainVersion,
  }
}
