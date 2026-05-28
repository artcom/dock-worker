import chalk from "chalk"

import envCommand from "./envCommand"
import { AppDescription } from "../types"
import { logBetween, lsRemote } from "../git"

const PRIMARY_REF = "refs/heads/main"
const FALLBACK_REF = "refs/heads/master"

type AppWithMainRef = {
  appName: string
  repo: string
  dockfileVersion: string
  defaultBranchVersion: string
  defaultBranchName: string
}

type OutdatedApp = AppWithMainRef & {
  commits: string[]
  warning?: string
}

export default envCommand(outdated)

async function outdated(descriptions: Array<AppDescription>) {
  const appVersions = await Promise.all(descriptions.map(loadMainVersion))

  const outdatedApps = appVersions.filter(
    (app) => app.dockfileVersion !== app.defaultBranchVersion,
  )

  const outdatedWithCommits = await Promise.all(
    outdatedApps.map(loadOutdatedAppWithCommits),
  )

  if (outdatedWithCommits.length === 0) {
    console.log(
      chalk.green("all services are on the latest default-branch commit"),
    )
    return
  }

  console.log(chalk.red("services with outdated Dockfile commit:"))

  outdatedWithCommits.forEach((app) => {
    console.log(chalk.bold(app.appName))
    console.log(`  dockfile: ${app.dockfileVersion}`)
    console.log(`  ${app.defaultBranchName}:     ${app.defaultBranchVersion}`)

    if (app.warning) {
      console.log(chalk.yellow(`  warning: ${app.warning}`))
    }

    if (app.commits.length === 0) {
      console.log("  commits: 0")
      return
    }

    console.log(`  commits: ${app.commits.length}`)
    app.commits.forEach((commit) => {
      console.log(`    - ${commit}`)
    })
  })
}

async function loadMainVersion(app: AppDescription): Promise<AppWithMainRef> {
  const primaryVersion = await lsRemote(app.repo, PRIMARY_REF)

  if (primaryVersion) {
    return {
      appName: app.name,
      repo: app.repo,
      dockfileVersion: app.version,
      defaultBranchVersion: primaryVersion,
      defaultBranchName: "main",
    }
  }

  const fallbackVersion = await lsRemote(app.repo, FALLBACK_REF)

  if (fallbackVersion) {
    return {
      appName: app.name,
      repo: app.repo,
      dockfileVersion: app.version,
      defaultBranchVersion: fallbackVersion,
      defaultBranchName: "master",
    }
  }

  throw new Error(
    `Could not resolve ${PRIMARY_REF} or ${FALLBACK_REF} for app "${app.name}" (${app.repo})`,
  )
}

async function loadOutdatedAppWithCommits(
  app: AppWithMainRef,
): Promise<OutdatedApp> {
  const logResult = await logBetween(
    app.repo,
    app.dockfileVersion,
    app.defaultBranchVersion,
  )

  return {
    ...app,
    commits: logResult.commits,
    warning: logResult.warning,
  }
}
