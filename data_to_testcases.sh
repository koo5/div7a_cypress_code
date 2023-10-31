#!/usr/bin/env fish
function _; or status --is-interactive; or exit 1; end

set -x PYTHONUNBUFFERED 1

set datadir $argv[1]

set -l temp $datadir/.tmp(date --utc +"%s"); mv $datadir/endpoint_tests $temp; rm -rf $temp & time ./data_to_testcases.py $datadir;_

ls -thrlsa $datadir/data/ | wc -l

ls -thrlsa $datadir/endpoint_tests/loan/good_atocalc_autogen/ | wc -l


