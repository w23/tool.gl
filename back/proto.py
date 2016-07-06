import sys
import json
import string
import random
import datetime
import traceback
import bcrypt
from peewee import *
import falcon

def randomString(size, chars):
    return ''.join(random.SystemRandom().choice(chars) for _ in range(size))

COOKIE_NAME = 'api_session_token'
SESSION_TOKEN_LENGTH = 128
SESSION_TOKEN_CHARS = string.ascii_letters + string.digits

def generateToken():
    return randomString(SESSION_TOKEN_LENGTH, SESSION_TOKEN_CHARS)

def passwordEncrypt(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(14))

def passwordCheck(password, pwhash):
    pwhash = pwhash.encode('utf-8')
    return bcrypt.hashpw(password.encode('utf-8'), pwhash) == pwhash

db = SqliteDatabase('tool.db')

class BaseModel(Model):
    id = PrimaryKeyField()
    created = DateTimeField(index = True, null = False, default = datetime.datetime.now)

    class Meta:
        database = db

class User(BaseModel):
    name = CharField(index = True, unique = True, null = False)
    login = CharField(index = True, unique = True)
    password = CharField()

    def applyUpdate(self, data):
        self.name = data.get('name', self.name)
        if 'password' in data:
            self.password = passwordEncrypt(data['password'])
        self.save()

    def serialize(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Session(BaseModel):
    token = CharField(index = True, unique = True)
    user = ForeignKeyField(User, related_name = 'sessions')
#    expires = DateTimeField(index = True, null = False)
#    permissions = CharField(index = True)

    def serialize(self):
        return {
            'id': self.id,
        }

class Scene(BaseModel):
    user = ForeignKeyField(User, related_name = 'scenes')
    public = BooleanField(index = True, default = False)
    title = CharField(null = False)
    description = TextField(null = False)
    content = TextField(null = False)

    def applyUpdate(self, data):
        self.public = data.get('public', self.public)
        self.title = data.get('title', self.title)
        self.description = data.get('description', self.description)
        if 'content' in data:
            self.content = json.dumps(data['content'])
        self.save()

    def serialize(self):
        return {
            'id': self.id,
            'user': self.user_id,
            'public': self.public,
            'title': self.title,
            'description': self.description,
            'content': json.loads(self.content)
        }

def serialize(objects):
    print(objects)
    if isinstance(objects, list):
        return [obj.serialize() for obj in objects]
    return objects.serialize() if objects else None

db.connect()

if len(sys.argv) > 1 and sys.argv[1] == 'create':
    db.create_tables([User, Session, Scene])
    exit(0)

def requirePermissions(req, *perms):
    session = req.context['session']
    if not session:
        raise falcon.HTTPUnauthorized('No session', 'This request requires valid session', None)

#    for perm in perms:
#        if perm not in session.permissions:
#            raise falcon.HTTPForbidden('Not allowed', 'Current session doesn\'t have a required permission')
    return session

class SessionsResource:
    def on_get(self, req, resp):
        session = requirePermissions(req, ['sessions_get'])
        req.context['response'] = serialize(session.user.sessions)

    def on_post(self, req, resp):
        data = req.context.get('data')
        if not data:
            session = Session.create(token = generateToken())
        else:
            try:
                login = data['login']
                password = data['password']
            except KeyError:
                raise falcon.HTTPMissingParam('Missing credentials', 'login and password required')
                
            user = User.get(User.login == login)
            if not user or not passwordCheck(password, user.password):
                raise falcon.HTTPUnauthorized('Invalid credentials', 'login or password is invalid', None)

            session = Session.create(user_id = user, token = generateToken())

        req.context['new_session'] = session
        req.context['response'] = session.serialize()

class SessionResource:
    def on_get(self, req, resp, session_id):
        session = requirePermissions(req, ['sessions_get_id'])
        target_session = Session.get(Session.session_id == session_id, Session.user_id == session.user_id)
        if not target_session:
            raise falcon.HTTPNotFound('No such session', 'Session with this id was not found')
        req.context['response'] = target_session.serialize()

    def on_delete(self, req, resp, session_id):
        session = requirePermission(req, ['session_delete'])
        target_session = Session.get(Session.session_id == session_id, Session.user_id == session.user_id)
        if not target_session:
            raise falcon.HTTPNotFound('No such session', 'Session with this id was not found')

        target_session.delete_instance()

class UsersResouce:
    def on_get(self, req, resp):
        req.context['response'] = serialize([user for user in User.select()])

    def on_post(self, req, resp):
        data = req.context.get('data')
        if not data or not 'login' in data or not 'password' in data:
            raise falcon.HTTPMissingParam('Missing credentials', 'login and password required')

        login = data['login']
        password = passwordEncrypt(data['password'])

        try:
            user = User.create(login = login, password = password, name = data.get('name'))
        except:
            print(traceback.format_exc())
            raise falcon.HTTPUnprocessableEntity('Cannot create user', str(traceback.format_exc()))

        req.context['response'] = serialize(user)

class UserResource:
    def on_get(self, req, resp, user_id):
        user = User.get(User.user_id == user_id)
        if not user:
            raise falcon.HTTPNotFound('No such user', 'User with this id was not found')
        req.context['response'] = serialize(user)

    def on_put(self, req, resp, user_id):
        data = req.context.get('data')
        if not data:
            raise falcon.HTTPMissingParam('Update data requred', 'What to do?')

        session = requirePermissions(req, ['user_edit'])
        if session.user_id != user_id:
            raise falcon.HTTPUnauthorized('Cannot edit user', 'This session cannot do edit this user', None)
            
        user = User.get(User.user_id == user_id)
        if not user:
            raise falcon.HTTPNotFound('No such user', 'User with this id was not found')

        user.applyUpdate(data)
        req.context['response'] = user.serialize()

class ScenesResource:
    def on_get(self, req, resp, user_id = None):
        session = req.context['session']
        constraints = []
        if user_id:
            constraints.append(Scene.user_id == user_id)
        if not session or user_id != session.user_id:
            constraints.append(Scene.public == True)

        scenes = Scene.select().where(*constraints)
 
        req.context['response'] = serialize(scenes if scenes else [])

    def on_post(self, req, resp):
        session = requirePermission(req, ['scenes_post'])
        
        try:
            data = req.context['data']
            public = data['public']
            title = data['title']
            description = data['description'] 
            content = data['content']
        except:
            raise falcon.HTTPMissingParam('', '')
            
        scene = Scene(user = session.user)
        scene.applyUpdate(data)

class SceneResource:
    def on_get(self, req, resp, scene_id):
        session = req.context['session']
        user = session.user if session else None

        scene = Scene.get(Scene.id == scene_id)

        if not scene.public and scene.user != user:
            raise falcon.HTTPUnauthorized('', '', None)

        req.context['response'] = serialize(scene)

    def on_put(self, req, resp, scene_id):
        session = requirePermission(req, ['scene_put'])
        scene = Scene.get(Scene.id == scene_id)

        if scene.user != user:
            raise falcon.HTTPUnauthorized('', '', None)

        data = req.context.get('data')
        if not data:
            raise falcon.HTTPMissingParam('', '')

        scene.applyUpdate(data)
        req.context['response'] = serialize(scene)

    def on_delete(self, req, resp, scene_id):
        session = requirePermission(req, ['scene_delete'])
        scene = Scene.get(Scene.id == scene_id)

        if scene.user != user:
            raise falcon.HTTPUnauthorized('', '', None)

        scene.delete_instance()
#
#class VersionsResource:
#    def on_get(self, req, resp, user_id):
#        raise falcon.HTTPServiceUnavailable('Not implemented')
#
#    def on_put(self, req, resp, user_id):
#        raise falcon.HTTPServiceUnavailable('Not implemented')
#
#class VersionResource:
#    def on_get(self, req, resp, user_id):
#        raise falcon.HTTPServiceUnavailable('Not implemented')
#
#    def on_put(self, req, resp, user_id):
#        raise falcon.HTTPServiceUnavailable('Not implemented')

class JSONPacker:
    def process_request(self, req, resp):
        if not req.client_accepts_json:
            raise falcon.HTTPNotAcceptable('Client must accept JSON')

        if req.method in ('POST', 'PUT'):
            if not req.content_type or 'application/json' not in req.content_type:
                raise falcon.HTTPUnsupportedMediaType('Client must send JSON')

        if req.content_length in (None, 0):
            req.context['data'] = None
            return

        body = req.stream.read()
        if not body:
            raise falcon.HTTPBadRequest('Body is empty')

        try:
            req.context['data'] = json.loads(body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            raise falcon.HTTPError(falcon.HTTP_753, 'Malformed JSON')

    def process_response(self, req, resp, resource):
        if 'response' not in req.context:
            return

        resp.body = json.dumps(req.context['response']).encode('utf-8')
        print(resp.body)

class ManageSessions:
    def process_request(self, req, resp):
        session = None

        if COOKIE_NAME in req.cookies:
            session = Session.get(Session.token == req.cookies[COOKIE_NAME])
            if not session:
                raise falcon.HTTPUnauthorized('Invalid session token', 'No session with such token exist', None)
        
        req.context['session'] = session

    def process_response(self, req, resp, resource):
        if 'new_session' in req.context:
            session = req.context['new_session']
            resp.set_cookie(COOKIE_NAME, session.token)

app = falcon.API(middleware=[JSONPacker(), ManageSessions()])

sessions = SessionsResource()
session = SessionResource()
users = UsersResouce()
user = UserResource()
scenes = ScenesResource()
scene = SceneResource()
#versions = VersionsResource()
#version = VersionResource()

app.add_route('/sessions', sessions)
#app.add_route('/users/{user_id}/sessions', sessions)
app.add_route('/sessions/{session_id}', session)

app.add_route('/users', users)
app.add_route('/users/{user_id}', user)

app.add_route('/scenes', scenes)
app.add_route('/users/{user_id}/scenes', scenes)
app.add_route('/scenes/{scene_id}', scene)

#app.add_route('/scenes/{scene_id}/versions', versions)
#app.add_route('/versions/{version_id}', version)

#if __name__ == '__main__':
#    httpd = simple_server.make_server('127.0.0.1', 8000, app)
#    httpd.serve_forever()
