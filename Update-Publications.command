#!/bin/zsh
cd "$(dirname "$0")" || exit 1
publication_node=$(command -v node)
if [[ -z "$publication_node" ]]; then
    publication_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$publication_node" ]]; then
    print "Node.js is required to update the saved publication list."
    read -r "publication_reply?Press Enter to close."
    exit 1
fi
"$publication_node" scripts/build-publications.mjs
publication_status=$?
read -r "publication_reply?Press Enter to close."
exit "$publication_status"
