from django.core.mail import send_mail
from django.contrib.auth.models import User as DefaultUser
from rest_framework.filters import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.authentication import TokenAuthentication
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.serializers import AuthTokenSerializer
from taggit.models import Tag
from api.permissions import IsOwnerOrReadOnly, IsSelfOrReadOnlyOrCreate
from api.serializers import DefaultUserSerializer,\
    MetaSceneSerializer,\
    SceneRevisionSerializer,\
    CustomTagsSerializer
from api.models import MetaScene, SceneRevision

import logging
logger = logging.getLogger(__name__)


class TaggitViewSet(ReadOnlyModelViewSet):
    serializer_class = CustomTagsSerializer
    queryset = Tag.objects.all()
    authentication_classes = (TokenAuthentication,)
    permission_classes = (AllowAny,)


class UserViewSet(ModelViewSet):
    serializer_class = DefaultUserSerializer
    queryset = DefaultUser.objects.all()
    authentication_classes = (TokenAuthentication,)
    permission_classes = (IsSelfOrReadOnlyOrCreate,)


class PrivateListMixIn(object):
    model = None

    def list(self, request, *args, **kwargs):
        queryset = self.model.objects.filter(access=self.model.PUBLIC)
        if request.user.id:
            queryset = queryset | \
                       self.model.objects.filter(access=self.model.PRIVATE, owner=request.user.id)

        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class MetaSceneViewSet(PrivateListMixIn, ModelViewSet):
    model = MetaScene
    serializer_class = MetaSceneSerializer
    queryset = model.objects.all()
    authentication_classes = (TokenAuthentication,)
    permission_classes = (IsOwnerOrReadOnly,)
    filter_fields = ('owner', 'tags__name')
    filter_backends = (DjangoFilterBackend,)


class SceneRevisionViewSet(PrivateListMixIn, ModelViewSet):
    model = SceneRevision
    serializer_class = SceneRevisionSerializer
    queryset = model.objects.all()
    authentication_classes = (TokenAuthentication,)
    permission_classes = (IsOwnerOrReadOnly,)
    filter_fields = ('owner', 'tags__name')
    filter_backends = (DjangoFilterBackend,)


class GetTokenView(APIView):
    serializer_class = AuthTokenSerializer
    authentication_classes = (AllowAny,)
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        """
        ---
        "parameters": [
          {
            "in": "body",
            "required": true,
            "name": "data",
            "schema": {
                "type": "object",
                "required": ["username", "password"],
                "properties": {
                  "username": {"type": "string"},
                  "password": {"type": "string"}
               }
            }
          }
        ]
        """
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)

        # if user.email:
        #     send_mail(
        #         'Here you token',
        #         'Use it as `Authorization: Token {}`'.format(token.key),
        #         'django@example.com',
        #         [user.email],
        #         fail_silently=False,
        #     )
        # else:
        #     logger.info('User {} have empty mail'.format(user.username))

        return Response({'auth_token': token.key})


# class CreatePassView(APIView):
#     authentication_classes = (AllowAny,)
#     serializer_class = RestorePassSerializer
#
#     def post(self, request, *args, **kwargs):
#         """
#         ---
#         "parameters": [
#           {
#             "in": "body",
#             "required": true,
#             "name": "data",
#             "schema": {
#                 "type": "object",
#                 "required": ["username"],
#                 "properties": {
#                   "username": {"type": "string"},
#                }
#             }
#           }
#         ]
#         """
#         serializer = self.serializer_class(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         user = serializer.validated_data['user']
#         new_pass = DefaultUser.objects.make_random_password()
#         user.set_password(new_pass)
#
#         if user.email:
#             send_mail(
#                 'Here you pass',
#                 'Not forget `{}`'.format(new_pass),
#                 'django@example.com',
#                 [user.email],
#                 fail_silently=False,
#             )
#         else:
#             logger.info('User {} have empty mail'.format(user.username))
#
#         return Response({'password': 'send to user email'})
