from rest_framework import permissions
from rest_framework.compat import is_authenticated
from api.models import _AccessMixIn


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute.
    http://www.django-rest-framework.org/api-guide/permissions/
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS\
                and obj.access == _AccessMixIn.ACCESS_TYPES[1][0]:
            return True

        # Instance must have an attribute named `owner`.
        is_authed = request.user and is_authenticated(request.user)
        is_owner = request.user and request.user == obj.owner
        return is_authed() and is_owner


class IsSelfOrReadOnlyOrCreate(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.method == 'POST':
            return True

        is_authed = request.user and is_authenticated(request.user)
        is_self = request.user and request.user.id == obj.id
        return is_authed and is_self


