#!/bin/sh

virtualenv venv
source venv/bin/activate
yes | pip install --update pip
yes | pip install gunicorn peewee falcon bcrypt
