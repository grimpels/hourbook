#!/bin/sh
# Porneste ca root doar cat sa repare dreptul de scriere pe /data, apoi coboara
# la utilizatorul `node`. Fara asta, un `./data` creat de Docker (deci al lui
# root) ar opri aplicatia la prima scriere.
set -e
if [ "$(id -u)" = "0" ]; then
	mkdir -p /data
	if [ "$(stat -c %u /data)" != "$(id -u node)" ]; then
		chown -R node:node /data
	fi
	exec su-exec node "$@"
fi
exec "$@"
