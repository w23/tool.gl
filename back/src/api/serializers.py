from rest_framework import serializers
from taggit.models import Tag
from taggit_serializer.serializers import TagListSerializerField, TaggitSerializer
from django.contrib.auth.models import User as DefaultUser
from api.models import UserProfile, MetaScene, SceneRevision


class _UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        exclude = ('created', 'updated', 'user')


class CustomTagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        exclude = ('slug',)


class DefaultUserSerializer(serializers.ModelSerializer):
    userprofile = _UserProfileSerializer()
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = DefaultUser
        fields = ('id', 'email', 'username', 'password', 'userprofile', 'date_joined')

    def create(self, validated_data):
        raw_user_profile = validated_data.pop('userprofile')
        default_user = DefaultUser.objects.create(**validated_data)
        UserProfile.objects.create(user_id=default_user.pk, **raw_user_profile)

        return default_user

    def update(self, instance, validated_data):
        raw_user_profile = {}
        if 'userprofile' in validated_data:
            raw_user_profile = validated_data.pop('userprofile')

        instance = super().update(instance, validated_data)
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
            instance.save()

        for attr, value in raw_user_profile.items():
            setattr(instance.userprofile, attr, value)
        instance.userprofile.save()

        return instance


class MetaSceneSerializer(TaggitSerializer, serializers.ModelSerializer):
    """
    ---
    fields:
      tags:
        type: array
        description: if tag not exist it will create auto
        items:
          type: string
    """
    tags = TagListSerializerField()

    class Meta:
        model = MetaScene
        exclude = ('created', 'updated')


class SceneRevisionSerializer(TaggitSerializer, serializers.ModelSerializer):
    """
    ---
    fields:
      tags:
        type: array
        description: if tag not exist it will create auto
        items:
          type: string
    """
    tags = TagListSerializerField()

    class Meta:
        model = SceneRevision
        exclude = ('created', 'updated')


# class RestorePassSerializer(serializers.Serializer):
#     username = serializers.CharField(label='Username')
#
#     def validate(self, attrs):
#         username = attrs.get('username')
#
#         try:
#             user = DefaultUser.objects.get(username=username)
#         except ObjectDoesNotExist:
#             raise serializers.ValidationError('Incorrect username', code='authorization')
#
#         attrs['user'] = user
#         return attrs
