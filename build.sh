#!/bin/bash

set -o allexport
source shared.env
set +o allexport


docker build --build-arg APP_VERSION=$APP_VERSION -t cellules/mail:${APP_VERSION} -t cellules/mail:latest .