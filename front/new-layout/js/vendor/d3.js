var D3 = {};

D3.Exception = function (message) {
	this.name = 'D3.Exception';
	this.message = message;
}

D3.createContextOnCanvas = function (canvas) {
	if (canvas.__D3_context__) {
		return canvas.__D3_context__;
	}

	var gl = canvas.getContext('webgl');

	if (!gl) {
		throw D3.Exception('Cannot acquire WebGL context');
	}

	var context = {};
	var state = {
		buffers: {},
		program: null,
		attributes: {},
		textures: [],
		active_texture: 0
	};

	state.textures[gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) - 1] = null;

	context.AttribType = {
		Byte: gl.BYTE,
		Short: gl.SHORT,
		UnsignedByte: gl.UNSIGNED_BYTE,
		UnsignedShort: gl.UNSIGNED_SHORT,
		Fixed: gl.FIXED,
		Float: gl.FLOAT
	};

	context.Primitive = {
		Points: gl.POINTS,
		Lines: gl.LINES,
		LineStrip: gl.LINE_STRIP,
		LineLoop: gl.LINE_LOOP,
		Triangles: gl.TRIANGLES,
		TriangleStrip: gl.TRIANGLE_STRIP,
		TriangleFan: gl.TRIANGLE_FAN
	};

	var makeShader = function (source, type) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw new D3.Exception(gl.getShaderInfoLog(shader));
		}

		return shader;
	};

	context.createProgram = function (sources) {
		var program = gl.createProgram();
		gl.attachShader(program, makeShader(sources.vertex, gl.VERTEX_SHADER));
		gl.attachShader(program, makeShader(sources.fragment, gl.FRAGMENT_SHADER));
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw {
				name: 'D3.ProgramLinkError',
				message: gl.getProgramInfoLog(program)
			};
		}

		return program;
	};

	var createBuffer = function (type) {
		var name = gl.createBuffer();
		var buffer = {};

		buffer.bind = function () {
			if (state.buffers[type] != this) {
				gl.bindBuffer(type, name);
				state.buffers[type] = this;
			}
		}

		var upload = function (that, data, usage) {
			that.bind();
			gl.bufferData(type, data, usage);
		}

		buffer.upload = function (data) {
			upload(this, data, gl.STATIC_DRAW);
			return this;
		}

		buffer.update = function (data) {
			upload(data, gl.DYNAMIC_DRAW);
			return this;
		}

		return buffer;
	};

	context.createVertexBuffer = function () {
		return createBuffer(gl.ARRAY_BUFFER);
	};

	context.createIndexBuffer = function () {
		return createBuffer(gl.ELEMENT_ARRAY_BUFFER);
	};

	context.TextureFormat = {
		R_8: {
			format: gl.LUMINANCE,
			type: gl.UNSIGNED_BYTE
		},
		RA_8: {
			format: gl.LUMINANCE_ALPHA,
			type: gl.UNSIGNED_BYTE
		},
		RGB_8: {
			format: gl.RGB,
			type: gl.UNSIGNED_BYTE
		},
		RGBA_8: {
			format: gl.RGBA,
			type: gl.UNSIGNED_BYTE
		},
		RGB_565: {
			format: gl.RGB,
			type: gl.UNSIGNED_SHORT_5_6_5
		},
		RGBA_5551: {
			format: gl.RGBA,
			type: gl.UNSIGNED_SHORT_5_5_5_1
		},
		RGBA_4444: {
			format: gl.RGBA,
			type: gl.UNSIGNED_SHORT_4_4_4_4
		}
	};

	context.createTexture = function () {
		var name = gl.createTexture();
		var tex = {};
		var width = 0, height = 0;

		tex.getWidth = function () {
			return width;
		}

		tex.getHeight = function () {
			return height;
		}

		tex.getName = function () {
			return name;
		}

		tex.bind = function () {
			if (state.textures[state.active_texture] !== this) {
				state.textures[state.active_texture] = this;
				gl.bindTexture(gl.TEXTURE_2D, name);
			}
			return this;
		}

		tex.bind.apply(this);

		tex.uploadEmpty = function (format, width_in, height_in) {
			this.bind();
			width = width_in;
			height = height_in;
			gl.texImage2D(gl.TEXTURE_2D, 0, format.format,
				width, height, 0, format.format, format.type, null);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);//LINEAR_MIPMAP_NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			return this;
		}

		tex.uploadImage = function (image) {
			this.bind();
			gl.texImage2D(gl.TEXTURE_2D, 0, format.format, format.format, format.type, image);
			width = image.naturalWidth;
			height = image.naturalHeight;
			return this;
		}

		tex.generateMipmap = function () {
			this.bind();
			gl.generateMipmap(gl.TEXTURE_2D);
			return this;
		}

		return tex;
	};

	context.createFramebuffer = function () {
		var name = gl.createFramebuffer();
		var that = {};

		var texture = null;
		var depth = null;

		that.getWidth = function () {
			return texture.getWidth();
		}

		that.getHeight = function () {
			return texture.getHeight();
		}

		that.attachColor = function (texture_in) {
			if (texture) { throw D3.Exception('Invalid argument'); }
			texture = texture_in;

			this.bind();
			gl.framebufferTexture2D(gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.getName(), 0);

			return this;
		}

		that.attachDepth = function () {
			depth = {
				name: gl.createRenderbuffer(),
				width: 0,
				height: 0
			};
			return this;
		}

		that.bind = function () {
			if (state.framebuffer !== this) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, name);
				state.framebuffer = this;
			}
		}

		that.use = function () {
			this.bind();

			if (depth) {
				if (depth.width != texture.getWidth() || depth.height != texture.getHeight()) {
					gl.bindRenderbuffer(gl.RENDERBUFFER);
					gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
						texture.getWidth(), texture.getHeight());
					depth.width = texture.getWidth();
					depth.height = texture.getHeight();
					gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER);
				}
			}

			var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
			if (status !== gl.FRAMEBUFFER_COMPLETE) {
				throw D3.Exception('Framebuffer incomplete');
			}
		}

		return that;
	}

	var setup_destination = function (dest) {
		if (dest) {
			if (dest.framebuffer) {
				dest.framebuffer.use();
				if (!dest.viewport) {
					gl.viewport(0, 0,
						dest.framebuffer.getWidth(), dest.framebuffer.getHeight());
				}
			}
			if (dest.viewport) {
				gl.viewport.apply(gl, dest.viewport);
			}
		} else {
			if (state.framebuffer) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				state.framebuffer = null;
			}
			gl.viewport(0, 0, canvas.width, canvas.height);
		}
	}

	context.fill = function (filldesc, destination) {
		setup_destination.apply(this, [destination]);

		var color = filldesc.color;
		var depth = filldesc.depth;
		var bits = 0;
		if (color) {
			bits = gl.COLOR_BUFFER_BIT;
			gl.clearColor(color[0], color[1], color[2], color[3]);
		}
		if (depth) {
			bits |= gl.DEPTH_BUFFER_BIT;
			gl.clearDepth(depth);
		}
		if (bits !== 0) {
			gl.clear(bits);
		}
	}

	var bindUniform = function (name, uni) {
		var loc = gl.getUniformLocation(state.program, name);
		if (loc) {
			uni(loc);
		}
	}

	var bindAttribute = function (name, attr) {
		var index = gl.getAttribLocation(state.program, name);
		if (index < 0) {
			return;
		}

		gl.enableVertexAttribArray(index);
		attr.buffer.bind();
		gl.vertexAttribPointer(index, attr.size, attr.type, attr.normalized || false, attr.stride || 0, attr.offset);
		state.attributes[index] = true;
	}

	var do_paint = function (paintdesc) {
		if (state.program !== paintdesc.program) {
			state.program = paintdesc.program;
			gl.useProgram(state.program);
		}

		for (var i = 0; i < state.textures.length; i += 1) {
			if (state.textures[i]) {
				gl.activeTexture(gl.TEXTURE0 + i);
				state.active_texture = i;
				gl.bindTexture(gl.TEXTURE_2D, null);
				state.textures[i] = null;
			}
		}

		if (paintdesc.uniforms) {
			for (uniform in paintdesc.uniforms) {
				if (paintdesc.uniforms.hasOwnProperty(uniform)) {
					bindUniform(uniform, paintdesc.uniforms[uniform]);
				}
			}
		}

		var oldattributes = state.attributes;
		state.attributes = {};
		for (attribute in paintdesc.attributes) {
			if (paintdesc.attributes.hasOwnProperty(attribute)) {
				bindAttribute(attribute, paintdesc.attributes[attribute]);
			}
		}
		for (attr in oldattributes) {
			if (oldattributes.hasOwnProperty(attr) && !(state.attributes[attr] && state.attributes.hasOwnProperty(attr))) {
				gl.disableVertexAttribArray(attr);
			}
		}

		if (paintdesc.index) {
			paintesc.index.buffer.bind();
			gl.drawElements(paintdesc.mode, paintesc.count, paintdesc.index.type || gl.UNSIGNED_SHORT, paintesc.index.offset || 0);
		} else {
			gl.drawArrays(paintdesc.mode, paintdesc.first || 0, paintdesc.count);
		}
	}

	context.rasterize = function (source, write, destination) {
		setup_destination.apply(this, [destination]);
		do_paint.apply(this, [source]);
		return this;
	}

	context.UniformFloat = function (value) {
		return function (loc) {
			gl.uniform1f(loc, value);
		}
	}

	context.UniformVec2 = function (value) {
		return function (loc) {
			gl.uniform2fv(loc, value);
		}
	}

	context.UniformVec3 = function (value) {
		return function (loc) {
			gl.uniform3fv(loc, value);
		}
	}

	context.UniformVec4 = function (value) {
		return function (loc) {
			gl.uniform4fv(loc, value);
		}
	}

	context.UniformSampler = function (texture) {
		return function (loc) {
			var unit = undefined;
			for (var i = 0; i < state.textures.length; i += 1) {
				if (state.textures[i] === texture) {
					unit = i;
					break;
				}
			}
			if (unit === undefined) {
				for (var i = 0; i < state.textures.length; i += 1) {
					if (!state.textures[i]) {
						gl.activeTexture(gl.TEXTURE0 + i);
						state.active_texture = i;
						texture.bind();
						unit = i;
						break;
					}
				}
				if (unit === undefined) {
					throw D3.Exception('Too many textures bound');
				}
			}
			gl.uniform1i(loc, unit);
		}
	}

	canvas.__D3_context__ = context;
	return context;
}