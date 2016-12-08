# define in settings SUPERUSER_NAME, SUPERUSER_PASSWORD and SUPERUSER_EMAIL
from __future__ import unicode_literals

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import DEFAULT_DB_ALIAS
from django.conf import settings


class Command(BaseCommand):

    def __init__(self, *args, **kwargs):
        super(Command, self).__init__(*args, **kwargs)
        self.UserModel = get_user_model()

    # option_list = BaseCommand.option_list
    help = 'Used to create a superuser.'

    def handle(self, *args, **options):
        database = DEFAULT_DB_ALIAS
        user_data = {}
        username = settings.SUPERUSER_EMAIL if self.UserModel.USERNAME_FIELD == 'email' else settings.SUPERUSER_NAME

        try:
            self.UserModel._default_manager.db_manager(database).get_by_natural_key(username)
        except self.UserModel.DoesNotExist:
            user_data[self.UserModel.USERNAME_FIELD] = settings.SUPERUSER_NAME
            user_data['password'] = settings.SUPERUSER_PASSWORD
            user_data['email'] = settings.SUPERUSER_EMAIL
            self.UserModel._default_manager.db_manager(database).create_superuser(**user_data)
