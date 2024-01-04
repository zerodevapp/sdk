#!/bin/bash

# Define the list of directories containing package.json files that should be built.
# Assuming that all packages are directly under the 'packages' and 'plugins' directories.

DIRECTORIES=("packages/*" "plugins/*")

# Loop through each directory and run 'bun run build'.
for DIR in ${DIRECTORIES[@]}; do
  # Check if the directory contains a package.json file.
  if [ -f "$DIR/package.json" ]; then
    # Use jq to check if a build script exists in the package.json
    if jq -e '.scripts.build' "$DIR/package.json" > /dev/null; then
      echo "Building $DIR"
      (cd $DIR && bun run build)
    else
      echo "No build script found in $DIR, skipping..."
    fi
  else
    # If the directory does not contain a package.json file, loop through its subdirectories.
    for SUBDIR in $DIR/*; do
      if [ -f "$SUBDIR/package.json" ]; then
        # Use jq to check if a build script exists in the package.json
        if jq -e '.scripts.build' "$SUBDIR/package.json" > /dev/null; then
          echo "Building $SUBDIR"
          (cd $SUBDIR && bun run build)
        else
          echo "No build script found in $SUBDIR, skipping..."
        fi
      fi
    done
  fi
done

echo "Build process completed."
