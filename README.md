# Whale Rider

Automated Dokku Deployment

## Usage

```bash
// list app and status information
$ whale <environment> status

// deploy apps and configuration
$ whale <environment> deploy
```

## App Definition

_Whale Rider_ will look for a configuration file named `Dockfile.json` in the current directory. Here is an example:

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

For a formal definition of what can go into `Dockfile.json`, have a look at the following [flow](http://flowtype.org) type annotations:

```javascript
type Config = {
  environment: Array<Environment>,
  apps: Array<App>
}

type Environment = {
  name: EnvironmentName,
  host: string,
  protocol?: string, // defaults to "ssh"
  username?: string // defaults to "dokku"
}

type EnvironmentName = string

type App = {
  name: string,
  repo: string,
  version: string,
  environments?: Array<EnvironmentName>,
  config?: Config,
  dockerOptions?: DockerOptions,
  stopBeforeDeployment: boolean
}

type Config = { [key: ConfigName]: ConfigValue | EnvironmentConfigs }
type ConfigName = string
type ConfigValue = string
type EnvironmentConfigs = { [key: EnvironmentName]: ConfigValue }

type DockerOptions = { [key: DockerOption]: Array<Phase> | EnvironmentDockerOption }
type DockerOption = string
type Phase = "build" | "deploy" | "run"
type EnvironmentDockerOption = { [key: EnvironmentName]: Array<Phase> }
```
