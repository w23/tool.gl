#!/bin/bash

set -x

cd src/

virtualenv -p python3 venv/

source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

python3 manage.py migrate --noinput
python3 manage.py collectstatic
python3 manage.py create_default_superuser

gunicorn main.wsgi:application -b 127.0.0.1:8080


