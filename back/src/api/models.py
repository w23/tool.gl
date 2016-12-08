from django.db import models
from taggit.managers import TaggableManager


# Create your models here.

class _CreatedUpdatedMixIn(models.Model):
    created = models.DateTimeField(auto_now_add=True, help_text='Object created date')
    updated = models.DateTimeField(auto_now=True, help_text='Object update date')

    class Meta:
        abstract = True


class _AccessMixIn(models.Model):
    PRIVATE = 0
    PUBLIC = 1
    ACCESS_TYPES = (
        (PRIVATE, 'Private'),
        (PUBLIC, 'Public')
    )
    owner = models.ForeignKey('auth.User',
                              help_text='Reference to user id')

    access = models.PositiveSmallIntegerField(
        choices=ACCESS_TYPES, default=PRIVATE, help_text=' {} '.format(ACCESS_TYPES))

    class Meta:
        abstract = True


class _TagsMixIn(models.Model):
    tags = TaggableManager(blank=True,
                           help_text='Array of tag-names')

    class Meta:
        abstract = True


class UserProfile(_CreatedUpdatedMixIn):
    user = models.OneToOneField('auth.User', primary_key=True, on_delete=models.CASCADE,
                                help_text='Reference to user id')

    description = models.TextField(null=True, blank=True,
                                   help_text='Small info about user')

    def __str__(self):
        return '{} ({})'.format(self.user.username, self.description or 'No descr')


class MetaScene(_CreatedUpdatedMixIn, _AccessMixIn, _TagsMixIn):
    ACCESS_TYPES = (
        (0, 'Private'),
        (1, 'Public')
    )

    name = models.CharField(max_length=64, unique=True,
                            help_text='Scene name (must be uniq) ')

    revision = models.OneToOneField('SceneRevision', on_delete=models.SET_NULL,
                                    null=True, blank=True,
                                    help_text='Reference to current version of Scene')

    def __str__(self):
        scene_name = self.name
        scene_rev = self.revision or 'No revision'
        return '{scene_name}/{scene_rev}'\
            .format(scene_name=scene_name, scene_rev=scene_rev)


class SceneRevision(_CreatedUpdatedMixIn, _AccessMixIn, _TagsMixIn):

    description = models.CharField(max_length=256, null=True, blank=True,
                                   help_text='Like a commit-message')

    parent = models.ForeignKey('SceneRevision',
                               null=True, blank=True,
                               help_text='Reference to parent Revision')

    gl_program = models.TextField(null=True, blank=True,
                                  help_text='Program in JSON')

    gl_params = models.TextField(null=True, blank=True,
                                 help_text='Params in JSON')

    def __str__(self):
        return self.description or 'No revision'

