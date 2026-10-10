import chalk from "chalk"
import fs from "fs"
import { promisify } from "util"
import read from "read-promise"
import yn from "yn"

import envCommand, { EnvCommandContext } from "./envCommand.js"
import { Action, deriveActions } from "../actions/index.js"
import { AppData, loadAppData } from "../appData.js"
import Dokku from "../dokku.js"
import RepoCache from "../repoCache.js"
import showMessageUntilSettled from "../showMessageUntilSettled.js"
import { AppDescription, Dockfile } from "../types.js"
import { logBetween, lsRemote } from "../git.js"

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
  dokku: Dokku,
  repoCache: RepoCache,
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

  const { dockfile, updatedServices, updatedServiceNames } =
    applyLatestVersions(context.dockfile, updates)

  await writeDockfile(context.dockfilePath, dockfile)

  console.log(
    chalk.green(
      `updated ${updatedServices} service(s) in ${context.dockfilePath}`,
    ),
  )

  if (updatedServiceNames.length === 0) {
    return
  }

  console.log(chalk.green("updated services:"))
  updatedServiceNames.forEach((service) => {
    console.log(`  - ${chalk.bold(service)}`)
  })

  if (!(await askForDeployConfirmation())) {
    return
  }

  const updatedDescriptions = descriptions.map((description) => {
    const latestVersion = updates[description.name]

    if (!latestVersion) {
      return description
    }

    return {
      ...description,
      version: latestVersion,
    }
  })

  await deployUpdatedServices(
    updatedDescriptions,
    updatedServiceNames,
    dokku,
    repoCache,
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
): {
  dockfile: Dockfile
  updatedServices: number
  updatedServiceNames: string[]
} {
  const updatedDockfile = JSON.parse(JSON.stringify(dockfile)) as Dockfile
  let updatedServices = 0
  const updatedServiceNames: string[] = []

  for (const app of updatedDockfile.apps) {
    const latestVersion = updates[app.name]

    if (latestVersion && app.version !== latestVersion) {
      updatedServices++
      updatedServiceNames.push(app.name)
      app.version = latestVersion
    }
  }

  return {
    dockfile: updatedDockfile,
    updatedServices,
    updatedServiceNames,
  }
}

async function writeDockfile(
  filePath: string,
  dockfile: Dockfile,
): Promise<void> {
  await writeFileAsync(filePath, `${JSON.stringify(dockfile, null, 2)}\n`)
}

async function askForDeployConfirmation(): Promise<boolean> {
  const answer = await read({
    prompt: "deploy updated services now (y/N)?",
  })
  return yn(answer)
}

async function deployUpdatedServices(
  descriptions: Array<AppDescription>,
  selectedApps: string[],
  dokku: Dokku,
  repoCache: RepoCache,
): Promise<void> {
  const apps = await loadAppData(descriptions, dokku, repoCache, selectedApps)
  const appActions = apps
    .map((app) => ({ appName: app.name, actions: deriveActions(app) }))
    .filter(({ actions }) => actions.length > 0)

  if (appActions.length === 0) {
    console.log(chalk.yellow("nothing to deploy for updated services"))
    return
  }

  console.log(chalk.cyan("deploying updated services:"))

  for (const { appName, actions } of appActions) {
    console.log(chalk.bold(appName))

    for (const action of actions) {
      const message = (spinner) =>
        chalk.gray(`${printAction(action)} ${spinner}`)
      await showMessageUntilSettled(message, action.run(dokku, repoCache))
      console.log(chalk.cyan(printAction(action)))
    }
  }
}

function printAction(action: Action): string {
  return action
    .describe()
    .map((description) => `  ${description}`)
    .join("\n")
}
