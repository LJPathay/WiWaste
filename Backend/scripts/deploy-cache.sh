#!/usr/bin/env sh
#
# WiWaste backend — production cache warm-up (Phase 19).
#
# Run it on the server, or as the last step of the deploy job, after
# `composer install --no-dev` and before traffic is switched over:
#
#   sh scripts/deploy-cache.sh
#   # equivalent: composer run deploy-cache
#
# Why it exists
# -------------
#   config:cache  bakes config/*.php into bootstrap/cache/config.php, so the app
#                 stops parsing .env on every request (the single biggest boot-cost
#                 saving in Laravel).
#   route:cache   loads the route list once instead of rebuilding it per request.
#   view:cache    pre-compiles the Blade templates.
#
# DO NOT run it on a development machine or before the test suite.
# `config:cache` freezes whatever .env says at the moment it runs, which means
# phpunit.xml's overrides (DB_DATABASE=wiwaste_test, MAIL_MAILER=array,
# CACHE_STORE=array, ...) would be ignored and the tests would point at the
# development database. `composer test` clears the config cache first for exactly
# that reason; keep it that way.

set -eu

php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Config, route and view caches written to bootstrap/cache/."
