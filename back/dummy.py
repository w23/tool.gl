import sys
import json
import datetime
import peewee
import falcon

DATABASE_NAME = 'dummy.db'

db = peewee.SqliteDatabase(DATABASE_NAME)

class DBObject(peewee.Model):
	id = peewee.PrimaryKeyField()
	created = peewee.DateTimeField(index = True, null = False, default = datetime.datetime.now)
	kind = peewee.CharField(index = True, null = False)
	content = peewee.TextField(index = True, null = False)

	def serialize(self):
		return {
			'id': self.id,
			'created': self.created.isoformat(),
			'kind': self.kind,
			'content': json.loads(self.content)
		}

	def replaceContent(self, new_content):
		self.content = json.dumps(new_content)
		return self

	class Meta:
		database = db

def serialize(objects):
	if isinstance(objects, list):
		return [serialize(obj) for obj in objects]
	if isinstance(objects, DBObject):
		return objects.serialize()
	return objects

db.connect()

if len(sys.argv) > 1 and sys.argv[1] == 'create':
	db.create_tables([DBObject])
	exit(0)

class ObjectCollection:
	def on_get(self, req, resp, kind):
		req.context['response'] = [obj.serialize() for obj in DBObject.select().where(DBObject.kind == kind)]

	def on_post(self, req, resp, kind):
		obj = DBObject(kind = kind).replaceContent(req.context['data'])
		obj.save()
		req.context['response'] = obj

class ObjectResource:
	def on_get(self, req, resp, kind, id):
		req.context['response'] = DBObject.get(DBObject.kind == kind and DBObject.id == id)

	def on_put(self, req, resp, kind, id):
		obj = DBObject.get(DBObject.kind == kind and DBObject.id == id)
		obj.replaceContent(req.context['data']).save()
		req.context['response'] = obj

	def on_delete(self, req, resp, kind, id):
		obj = DBObject.get(DBObject.kind == kind and DBObject.id == id)
		serialized = obj.serialize()
		obj.delete_instance()
		req.context['response'] = serialized

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

        resp.body = json.dumps(serialize(req.context['response'])).encode('utf-8')

app = falcon.API(middleware=[JSONPacker()])

app.add_route('/{kind}', ObjectCollection())
app.add_route('/{kind}/{id}', ObjectResource())
