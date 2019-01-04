# Dock Worker

Automated Dokku Deployment

## Prerequisites

The following tools need to be installed:

* `git`
* `ssh`

Both tools need to be able to access the source repos and the Dokku host, e.g. using

* SSH public key authentication or
* a Git [credential helper](https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage).

ssh public key authetication works via `ssh-agent`. Make sure your identitiy is added and `ssh-agent` is running.

Make sure you are able to clone from the git server that hosts the service repos. (first clone from github.com, etc.)

The authenticity of host _git-host_ can't be established.
ECDSA key fingerprint is SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.

## Usage

```bash
  Usage:
    dock <environment> status [options]                     list app and status information
    dock <environment> deploy [--yes] [<app>...] [options]  deploy apps and configuration
    dock environments [options]                             list available environments
    dock version                                            show dock-worker version

  Options:
    -f FILE --file=FILE                                     Dockfile path [default: Dockfile.json]
```

## App Definition

_Dock Worker_ will look for a configuration file named `Dockfile.json` in the current directory. Here is an example:

```json
{
  "environments": [
    {
      "name": "staging",
      "host": "dokku@staging.example.com"
    },
    {
      "name": "production",
      "host": "dokku@production.example.com"
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
        }
      },
      "dockerOptions": {
        "-p=8000:8000": ["deploy", "run"]
      },
      "stopBeforeDeployment": true
    }
  ]
}
```
