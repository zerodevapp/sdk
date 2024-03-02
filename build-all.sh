#!/bin/bash

# Define ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Define the list of directories containing package.json files that should be built.
# Assuming that all packages are directly under the 'packages' and 'plugins' directories.
DIRECTORIES=("packages/*" "plugins/*")

# Arrays to keep track of build statuses
SUCCEEDED=()
FAILED=()

# Loop through each directory and run 'bun run build'.
for DIR in ${DIRECTORIES[@]}; do
  # Check if the directory contains a package.json file.
  if [ -f "$DIR/package.json" ]; then
    # Use jq to check if a build script exists in the package.json
    if jq -e '.scripts.build' "$DIR/package.json" > /dev/null; then
      echo "🔨 Attempting to build $DIR"
      if (cd $DIR && bun run build); then
        printf "${GREEN}✅ Build succeeded for $DIR${NC}\n\n"
        SUCCEEDED+=("$DIR")
      else
        printf "${RED}❌ Build failed for $DIR${NC}\n\n"
        FAILED+=("$DIR")
      fi
    else
      echo "⏩ No build script found in $DIR, skipping...\n"
    fi
  else
    # If the directory does not contain a package.json file, loop through its subdirectories.
    for SUBDIR in $DIR/*; do
      if [ -f "$SUBDIR/package.json" ]; then
        # Use jq to check if a build script exists in the package.json
        if jq -e '.scripts.build' "$SUBDIR/package.json" > /dev/null; then
          echo "🔨 Attempting to build $SUBDIR"
          if (cd $SUBDIR && bun run build); then
            printf "${GREEN}✅ Build succeeded for $SUBDIR${NC}\n\n"
            SUCCEEDED+=("$SUBDIR")
          else
            printf "${RED}❌ Build failed for $SUBDIR${NC}\n\n"
            FAILED+=("$SUBDIR")
          fi
        else
          echo "⏩ No build script found in $SUBDIR, skipping...\n"
        fi
      fi
    done
  fi
done

echo "🏁 Build process completed.\n"

# Print summary
if [ ${#SUCCEEDED[@]} -ne 0 ]; then
    printf "${GREEN}✅ Build succeeded for:${NC}\n"
    for item in "${SUCCEEDED[@]}"; do
        printf "${GREEN}- $item${NC}\n"
    done
fi

if [ ${#FAILED[@]} -ne 0 ]; then
    printf "\n${RED}❌ Build failed for:${NC}\n"
    for item in "${FAILED[@]}"; do
        printf "${RED}- $item${NC}\n"
    done
fi
