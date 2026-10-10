export const EXIT_ERROR = 1
export const EXIT_USAGE = 2
export const EXIT_ENVIRONMENT = 3

export class DockError extends Error {
  exitCode: number

  constructor(message: string, exitCode: number = EXIT_ERROR) {
    super(message)
    this.exitCode = exitCode
  }
}

// one JSON object per line on stdout, so results can be piped into jq
export function printJson(value: object): void {
  process.stdout.write(JSON.stringify(value) + "\n")
}
