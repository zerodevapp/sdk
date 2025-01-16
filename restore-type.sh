#!/bin/bash

# Define the list of directories containing package.json files
DIRECTORIES=("packages/*" "plugins/*")

restore_type_field() {
    local dir=$1
    local package_file="$dir/package.json"
    local type_file="$package_file.type"
    
    if [ -f "$type_file" ]; then
        TYPE=$(cat "$type_file")
        echo "📦 Restoring type field to $package_file"
        # Restore type field in its original position by converting to entries again
        jq --arg type "$TYPE" 'to_entries | map(select(.key != "type")) | . + [{"key": "type", "value": $type}] | from_entries' "$package_file" > "$package_file.tmp" && mv "$package_file.tmp" "$package_file"
        rm "$type_file"
    fi
}

# Process all packages
for DIR in ${DIRECTORIES[@]}; do
    if [ -f "$DIR/package.json" ]; then
        restore_type_field "$DIR"
    else
        for SUBDIR in $DIR/*; do
            if [ -f "$SUBDIR/package.json" ]; then
                restore_type_field "$SUBDIR"
            fi
        done
    fi
done 