import chalk from "chalk"
import fs from "fs"
import { promisify } from "util"
import read from "read-promise"
import yn from "yn"

import envCommand, { EnvCommandContext } from "./envCommand"
import { AppData, loadAppData } from "../appData"
import { AppDescription, Dockfile } from "../types"
import { logBetween, lsRemote } from "../git"

const PRIMARY_REF = "refs/heads/main"
const FALLBACK_REF = "refs/heads/master"
const writeFileAsync = promisify(fs.writeFile)

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
  currentVersion: string
  deployed: boolean
  running: boolean
}

export default envCommand(outdated)

async function outdated(
  descriptions: Array<AppDescription>,
  dokku,
  repoCache,
  _options,
  context: EnvCommandContext,
) {
  const apps = await loadAppData(descriptions, dokku, repoCache)
  const appDataByName = new Map(apps.map((app) => [app.name, app]))

  const appVersions = await Promise.all(descriptions.map(loadMainVersion))

  const outdatedApps = appVersions.filter(
    (app) => app.dockfileVersion !== app.defaultBranchVersion,
  )

  const outdatedWithCommits = await Promise.all(
    outdatedApps.map((app) =>
      loadOutdatedAppWithCommits(app, appDataByName.get(app.appName)),
    ),
  )

  if (outdatedWithCommits.length === 0) {
    console.log(
      chalk.green("all services are on the latest default-branch commit"),
    )
    return
  }

  console.log(chalk.red.bold("services with outdated Dockfile commit:"))

  outdatedWithCommits.forEach((app) => {
    console.log("")
    console.log(chalk.bold.white(app.appName))
    console.log(`  dockfile: ${chalk.yellow(app.dockfileVersion)}`)
    console.log(
      `  latest ${app.defaultBranchName}: ${chalk.green(app.defaultBranchVersion)}`,
    )
    console.log(`  running: ${printCurrentVersion(app)}`)

    if (app.warning) {
      console.log(chalk.yellow(`  warning: ${app.warning}`))
    }

    if (app.commits.length === 0) {
      console.log("  commits: 0")
      return
    }

    console.log(`  commits: ${chalk.cyan(app.commits.length.toString())}`)
    app.commits.forEach((commit) => {
      console.log(`    - ${colorizeCommit(commit)}`)
    })
  })

  console.log("")

  const shouldApply = await askForApplyConfirmation()

  if (!shouldApply) {
    return
  }

  const updates: { [appName: string]: string } = {}
  outdatedWithCommits.forEach((app) => {
    updates[app.appName] = app.defaultBranchVersion
  })

  const { dockfile, updatedServices } = applyLatestVersions(
    context.dockfile,
    updates,
  )

  await writeDockfile(context.dockfilePath, dockfile)

  console.log(
    chalk.green(
      `updated ${updatedServices} service(s) in ${context.dockfilePath}`,
    ),
  )
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
  appData: AppData,
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
    currentVersion: appData?.actual.version || "",
    deployed: Boolean(appData?.deployed),
    running: Boolean(appData?.running),
  }
}

function printCurrentVersion(app: OutdatedApp): string {
  if (app.running && app.currentVersion) {
    return chalk.green(app.currentVersion)
  }

  if (app.deployed && app.currentVersion) {
    return chalk.yellow(`${app.currentVersion} (stopped)`)
  }

  return chalk.gray("not deployed")
}

function colorizeCommit(commit: string): string {
  const match = commit.match(/^(\w+)\s+(.*)$/)

  if (!match) {
    return chalk.gray(commit)
  }

  const [, hash, subject] = match
  return `${chalk.magenta(hash)} ${chalk.gray(subject)}`
}

async function askForApplyConfirmation(): Promise<boolean> {
  const answer = await read({
    prompt: "apply latest commit hashes to Dockfile (y/N)?",
  })
  return yn(answer)
}

function applyLatestVersions(
  dockfile: Dockfile,
  updates: { [appName: string]: string },
): { dockfile: Dockfile; updatedServices: number } {
  const updatedDockfile = JSON.parse(JSON.stringify(dockfile)) as Dockfile
  let updatedServices = 0

  for (const app of updatedDockfile.apps) {
    const latestVersion = updates[app.name]

    if (latestVersion && app.version !== latestVersion) {
      updatedServices++
      app.version = latestVersion
    }
  }

  return {
    dockfile: updatedDockfile,
    updatedServices,
  }
}

async function writeDockfile(
  filePath: string,
  dockfile: Dockfile,
): Promise<void> {
  await writeFileAsync(filePath, `${JSON.stringify(dockfile, null, 2)}\n`)
}
