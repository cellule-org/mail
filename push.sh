#!/bin/bash

set -o allexport
source shared.env
set +o allexport

./build.sh

# Push les deux
docker push cellules/mail:$APP_VERSION
docker push cellules/mail:latest