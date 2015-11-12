import colors from "colors/safe"
import elegantSpinner from "elegant-spinner"
import logUpdate from "log-update"

export default function(message, promise) {
  const spinner = elegantSpinner()
  const interval = setInterval(function() {
    logUpdate(colors.gray(`${message} ${spinner()}`))
  }, 50)

  function stopSpinner() {
    clearInterval(interval)
    logUpdate.clear()
  }

  return promise.then(
    (result) => {
      stopSpinner()
      return result
    },
    (error) => {
      stopSpinner()
      throw error
    }
  )
}
