# Dock Worker

Automated Dokku Deployment

## Prerequisites

The following tools need to be installed:

* `git`
* `ssh`

Both tools need to be able to access the source repos and the Dokku host, e.g. using

* SSH public key authentication or
* a Git [credential helper](https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage).

## Usage

```bash
// list available commands
$ dock

// list available environments
$ dock environments

// list app and status information
$ dock <environment> status

// deploy apps and configuration
$ dock <environment> deploy
```

## App Definition

_Dock Worker_ will look for a configuration file named `Dockfile.json` in the current directory. Here is an example:

```json
{
  "environments": [
    {
      "name": "staging",
      "host": "staging.example.com"
    },
    {
      "name": "production",
      "host": "production.example.com"
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
