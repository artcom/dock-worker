createRepos () {
  set -eo pipefail
  declare DIRECTORY="$1"

  if [[ -z "$DIRECTORY" ]]; then
    echo "Missing directory parameter"
    exit 1
  fi

  git init "$DIRECTORY/source-code"
  cd "$DIRECTORY/source-code"

  echo "console.log('hello world')" > main.js
  git add main.js
  git commit -m "Initial commit"

  git init --bare "$DIRECTORY/dokku-app"
  git remote add dokku "$DIRECTORY/dokku-app"
  git push dokku master

  echo "Hello World Example" > README.md
  git add README.md
  git commit -m "Add README"
}

createRepos $@
