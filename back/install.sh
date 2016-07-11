#!/bin/sh

virtualenv venv || pyvenv venv
source venv/bin/activate
yes | pip install --upgrade pip
yes | pip install gunicorn peewee falcon bcrypt
python dummy.py create
