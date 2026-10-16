#!/bin/bash
# Publishes all packages. The package.json "type" fields are restored and the
# repo formatted even when the build or publish fails; exits non-zero if any
# step failed.
bash remove-type.sh || exit 1

bun run build && changeset publish
status=$?

mark_failed() { if [ "$status" -eq 0 ]; then status=1; fi; }
bash restore-type.sh || mark_failed
bun run format || mark_failed

exit "$status"
