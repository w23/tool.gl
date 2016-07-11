#!/bin/sh

while true; do sleep 1; gunicorn --reload dummy:app; done
