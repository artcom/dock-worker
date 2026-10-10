# Dock Worker

Automated Dokku Deployment

## Prerequisites

The following tools need to be installed:

- `git`
- `ssh`

Both tools need to be able to access the source repos and the Dokku host, e.g. using

- SSH public key authentication or
- a Git [credential helper](https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage).

The ssh public key authentication works via `ssh-agent`. Make sure your identitiy is [added](https://www.ssh.com/ssh/add) via `ssh-add` and the `ssh-agent` is running.

Make sure you are able to clone from the git server that hosts the service repos. (first clone from github.com, etc.)

The authenticity of host _git-host_ can't be established.
ECDSA key fingerprint is SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.

## Usage

```bash
  Usage:
    dock <environment> status [--json] [options]            list app and status information
    dock <environment> deploy [--yes] [--dry-run] [--json] [<app>...] [options]
                                                            deploy apps and configuration
    dock <environment> logs <app> [--num=N] [--json] [options]
                                                            show recent app logs
    dock <environment> outdated [options]                   list apps behind main/master branch
    dock environments [options]                             list available environments
    dock version                                            show dock-worker version

  Options:
    -f FILE --file=FILE                                     Dockfile path [default: Dockfile.json]
    -n N --num=N                                            number of log lines [default: 100]
    --json                                                  print one JSON object per line to stdout
    --dry-run                                               show what deploy would do without changing anything
```

### Machine-Readable Output

With `--json`, results are written to stdout as one JSON object per line. Progress spinners go to stderr and are only shown when stderr is a terminal, so the output can be piped into tools like `jq`.

```bash
# apps that differ from the Dockfile
dock production status --json | jq -c 'select(.inSync | not) | {app, pending}'

# what a deployment would change, without changing anything
dock staging deploy --dry-run --json

# error log lines of an app
dock production logs ai-assistant -n 500 --json | jq -c 'select(.data.level == "error")'
```

`status --json` prints `{app, environment, status, deployed, running, inSync, version: {expected, actual}, pending}`, where `pending` lists the action kinds a deployment would run (`create`, `config`, `docker-options`, `push`, `start`).

`deploy --json` prints `{app, state, actions}` per app, with `state` being `planned` (dry run), `pending` or `deployed`. Since it cannot prompt for confirmation, `--json` requires `--dry-run` or `--yes`.

`logs --json` prints `{timestamp, process, data}` for lines with a JSON payload and `{timestamp, process, message}` otherwise.

### Exit Codes

| Code | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| 0    | success                                                 |
| 1    | command failed                                          |
| 2    | usage error, e.g. unknown app or invalid option        |
| 3    | environment error, e.g. unreadable Dockfile or host unreachable |

## App Definition

_Dock Worker_ will look for a configuration file named `Dockfile.json` in the current directory. Here is an example:

```json
{
  "environments": [
    {
      "name": "staging",
      "host": "dokku@staging.example.com",
      "composeHost": "staging.example.com"
    },
    {
      "name": "production",
      "host": "dokku@production.example.com",
      "composeHost": "production.example.com"
    }
  ],
  "apps": [
    {
      "name": "debug-service",
      "repo": "git@github.com:artcom/debug-service.git",
      "version": "01cf5ecf0e68b19a691c215e56ba0bf363f17fc1",
      "environments": ["staging"]
    },
    {
      "name": "retrieval-service",
      "repo": "git@github.com:artcom/retrieval-service.git",
      "version": "ebf005e11bd097e0e69a05b320afa89e835a9f2e",
      "config": {
        "DISPLAY_NAME": "Retrieval Service",
        "RETRIEVE_FROM": {
          "staging": "http://staging-db.example.com",
          "production": "http://db.example.com"
        },
        "DATABASE_URL": "postgresql://user:pass@${host}:5432/db",
        "COMPOSE_HOST": "${composeHost}"
      },
      "dockerOptions": {
        "-p=8000:8000": ["deploy", "run"]
      },
      "stopBeforeDeployment": true
    }
  ]
}
```

### Environment Variable Placeholders

Config values support placeholder replacement for environment-specific values:

- `${host}` - Replaced with the environment's `host` value
- `${composeHost}` - Replaced with the environment's `composeHost` value

These placeholders are resolved at deployment time based on the target environment. In the example above, deploying to staging would replace `${host}` with `dokku@staging.example.com` and `${composeHost}` with `staging.example.com`.
