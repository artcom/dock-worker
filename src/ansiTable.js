import stripAnsi from "strip-ansi"
import table from "text-table"

export default function ansiTable(rows) {
  return table(rows, { stringLength })
}

function stringLength(string) {
  return stripAnsi(string).length
}
