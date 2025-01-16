#!/bin/bash

# Define the list of directories containing package.json files
DIRECTORIES=("packages/*" "plugins/*")

remove_type_field() {
    local dir=$1
    local package_file="$dir/package.json"
    
    if TYPE=$(jq -r '.type // empty' "$package_file"); then
        echo "📦 Removing type field from $package_file"
        # Convert to array of key-value pairs, filter out type, convert back while preserving order
        jq 'to_entries | map(select(.key != "type")) | from_entries' "$package_file" > "$package_file.tmp" && mv "$package_file.tmp" "$package_file"
        echo "$TYPE" > "$package_file.type"
    fi
}

# Process all packages
for DIR in ${DIRECTORIES[@]}; do
    if [ -f "$DIR/package.json" ]; then
        remove_type_field "$DIR"
    else
        for SUBDIR in $DIR/*; do
            if [ -f "$SUBDIR/package.json" ]; then
                remove_type_field "$SUBDIR"
            fi
        done
    fi
done 