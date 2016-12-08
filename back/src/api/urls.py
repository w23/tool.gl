from django.conf.urls import url, include
from rest_framework_nested import routers
from api import views as api_views

router = routers.DefaultRouter()
router.register(r'user', api_views.UserViewSet)
router.register(r'scene', api_views.MetaSceneViewSet)
router.register(r'revision', api_views.SceneRevisionViewSet)
router.register(r'tag', api_views.TaggitViewSet)

urlpatterns = [
    url(r'^auth/', include('rest_framework.urls', namespace='rest_framework')),
    url(r'^get-token/', api_views.GetTokenView.as_view()),
    url(r'^', include(router.urls)),
]
