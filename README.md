# Whale Rider

Automated Dokku Deployment

## Usage

```bash
// list service and status information
$ whale <environment> status

// deploy services and configuration
$ whale <environment> deploy
```

## Service Definition

_Whale Rider_ will look for a configuration file named `services.json` in the current directory. Here is an example:

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
  "services": [
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

For a formal definition of what can go into `services.json`, have a look at the following [flow](http://flowtype.org) type annotations:

```javascript
type Config = {
  environment: Array<Environment>,
  services: Array<Service>
}

type Environment = {
  name: EnvironmentName,
  host: string,
  protocol?: string, // defaults to "ssh"
  username?: string // defaults to "dokku"
}

type EnvironmentName = string

type Service = {
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
