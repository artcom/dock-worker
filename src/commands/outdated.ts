import chalk from "chalk"

import envCommand from "./envCommand"
import { AppDescription } from "../types"
import { lsRemote } from "../git"

const PRIMARY_REF = "refs/heads/main"
const FALLBACK_REF = "refs/heads/master"

type AppWithMainRef = {
  appName: string
  dockfileVersion: string
  defaultBranchVersion: string
  defaultBranchName: string
}

export default envCommand(outdated)

async function outdated(descriptions: Array<AppDescription>) {
  const appVersions = await Promise.all(descriptions.map(loadMainVersion))

  const outdatedApps = appVersions.filter(
    (app) => app.dockfileVersion !== app.defaultBranchVersion,
  )

  if (outdatedApps.length === 0) {
    console.log(
      chalk.green("all services are on the latest default-branch commit"),
    )
    return
  }

  console.log(chalk.red("services with outdated Dockfile commit:"))

  outdatedApps.forEach((app) => {
    console.log(chalk.bold(app.appName))
    console.log(`  dockfile: ${app.dockfileVersion}`)
    console.log(`  ${app.defaultBranchName}:     ${app.defaultBranchVersion}`)
  })
}

async function loadMainVersion(app: AppDescription): Promise<AppWithMainRef> {
  const primaryVersion = await lsRemote(app.repo, PRIMARY_REF)

  if (primaryVersion) {
    return {
      appName: app.name,
      dockfileVersion: app.version,
      defaultBranchVersion: primaryVersion,
      defaultBranchName: "main",
    }
  }

  const fallbackVersion = await lsRemote(app.repo, FALLBACK_REF)

  if (fallbackVersion) {
    return {
      appName: app.name,
      dockfileVersion: app.version,
      defaultBranchVersion: fallbackVersion,
      defaultBranchName: "master",
    }
  }

  throw new Error(
    `Could not resolve ${PRIMARY_REF} or ${FALLBACK_REF} for app "${app.name}" (${app.repo})`,
  )
}
