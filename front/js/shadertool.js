var ShaderTool = new (function ShaderTool(){

    function catchReady(fn) {
        var L = 'loading';
        if (document.readyState != L){
            fn();
        } else if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            document.attachEvent('onreadystatechange', function() {
                if (document.readyState != L){
                    fn();
                }    
            });
        }
    }

    this.VERSION = '0.01';

    this.modules = {};
    this.classes = {};

    var self = this;
    catchReady(function(){
        self.modules.Ticker.init();
        self.modules.GUIHelper.init();
        self.modules.ControlsFactory.init();
        self.modules.Controls.init();
        self.modules.Editor.init();
        self.modules.Rendering.init();

        document.documentElement.className = '_ready';
    });

})();

// Utils
ShaderTool.utils = {
    trim: function( string ){
        return string.replace(/^\s+|\s+$/g, '');
    },
    isSet: function( object ){
        return typeof object != 'undefined' && object != null
    },
    isArray: function( object ){
        return Object.prototype.toString.call(object) === '[object Array]';
    },
    isArrayLike: function( object ){
        if(this.isArray(object)){ return true; }
        if(this.isObject(object) && this.isNumber(object.length) ){ return true; }
        return false;
    },
    isNumber: function( object ){
        return typeof object == 'number' && !isNaN(object);
    },
    isFunction: function( object ){
        return typeof object == 'function';
    },
    isObject: function( object ){
        return typeof object == 'object';
    },
    isString: function( object ){
        return typeof object == 'string';
    },
    createNamedObject: function( name, props ){
        return internals.createNamedObject( name, props );
    },
    testCallback: function( callback, applyArguments, context ){
        if(this.isFunction(callback)){
            return callback.apply(context, applyArguments || []);
        }
        return null;
    },
    copy: function( from, to ){
        for(var i in from){ to[i] = from[i]; }
        return to;
    },
    delegate: function( context, method ){
        return function delegated(){
            for(var argumentsLength = arguments.length, args = new Array(argumentsLength), k=0; k<argumentsLength; k++){
                args[k] = arguments[k];
            }
            return method.apply( context, args );
        }
    },
    debounce: function(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate){
                    func.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow){
                func.apply(context, args);
            }
        };
    },  
    throttle: function(func, ms) {
        var isThrottled = false, savedArgs, savedThis;

        function wrapper() {

            if (isThrottled) {
                savedArgs = arguments;
                savedThis = this;
                return;
            }

            func.apply(this, arguments);

            isThrottled = true;

            setTimeout(function() {
                isThrottled = false;
                if (savedArgs) {
                    wrapper.apply(savedThis, savedArgs);
                    savedArgs = savedThis = null;
                }
            }, ms);
        }

        return wrapper;
    },
    now: function(){
        var P = 'performance';
        if (window[P] && window[P]['now']) {
            this.now = function(){ return window.performance.now() }
        } else {
            this.now = function(){ return +(new Date()) }
        }
        return this.now();
    },
    isFunction: function( object ){
        return typeof object == 'function';
    },
    // future methods:
    isArray: function(){},
    isArrayLike: function(){},
    copyObject: function(){}
};

// Callback (Signal?)
ShaderTool.utils.Callback = (function(){
    // Callback == Signal ?
    function Callback() {
        this._handlers = [];

        var self = this;
        this.callShim = function(){
            self.call.apply(self, arguments);
        }
    }

    Callback.prototype = {
        _throwError: function() {
            throw new TypeError('Callback handler must be function!');
        },

        add: function(handler, context) {
            if (typeof handler != 'function') {
                this._throwError();
                return;
            }

            this.remove(handler);
            this._handlers.push({handler:handler, context: context});
        },

        remove: function(handler) {
            if (typeof handler != 'function') {
                this._throwError();
                return;
            }

            var totalHandlers = this._handlers.length;
            for (var k = 0; k < totalHandlers; k++) {
                if (handler === this._handlers[k].handler) {
                    this._handlers.splice(k, 1);
                    return;
                }
            }
        },

        call: function() {
            var totalHandlers = this._handlers.length;
            for (var k = 0; k < totalHandlers; k++) {
                var handlerData = this._handlers[k];
                handlerData.handler.apply(handlerData.context || null, arguments);
            }
        }
    };

    return Callback;
})();

ShaderTool.utils.Float32Array = (function(){
    return typeof Float32Array === 'function' ? Float32Array : Array;
})();

// Modules

// Ticker
ShaderTool.modules.Ticker = (function(){
    var raf;
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];

    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame){
        raf = function( callback ) {
            var currTime = utils.now();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));

            var id = window.setTimeout( function(){
                callback(currTime + timeToCall);
            }, timeToCall);

            lastTime = currTime + timeToCall;
            return id;
        };
     } else {
         raf = function( callback ){
             return window.requestAnimationFrame( callback );
         }
     }

    function Ticker(){};
    Ticker.prototype = {
        init: function(){
            console.log('ShaderTool.modules.Ticker.init');

            this.onTick = new ShaderTool.utils.Callback();

            var activeState = true;
            var applyArgs = [];
            var listeners = [];
            var prevTime = ShaderTool.utils.now();
            var elapsedTime = 0;
            var timeScale = 1;
            var self = this;
			var skippedFrames = 0;
			var maxSkipFrames = 3;

            this.stop = this.pause = this.sleep = function(){
                activeState = false;
                return this;
            }
            this.start = this.wake = function(){
                activeState = true;
                return this;
            }
            this.timeScale = function( value ){
                if(ShaderTool.utils.isSet(value)){ timeScale = value; }
                return timeScale;
            }    
            this.toggle = function(){
                return (activeState ? this.stop() : this.start());
            }    
            this.isActive = function(){
                return activeState;
            }

            function tickHandler( nowTime ){

                var delta = (nowTime - prevTime) * timeScale;
                prevTime = nowTime;

                elapsedTime += delta;

            	if(skippedFrames < maxSkipFrames){
            		skippedFrames++;
            	} else {
	                if(activeState){
	                    self.onTick.call(delta, elapsedTime)
	                }            		
            	}

                raf( tickHandler );
            }
            raf( tickHandler );

        }
    }
    return new Ticker();
})();

// Future module
ShaderTool.modules.GUIHelper = (function(){
    function GUIHelper(){}
    GUIHelper.prototype = {
        init: function(){
            console.log('ShaderTool.modules.GUIHelper.init')
        },
        showError: function( message ){
            console.error('GUIHelper: ' + message)
        }
    }
    return new GUIHelper();
})();

// Editor
ShaderTool.modules.Editor = (function(){

    function Editor(){}

    Editor.prototype = {
        init: function(){
            console.log('ShaderTool.modules.Editor.init');

            this.element = document.getElementById('editor');

            this._editor = ace.edit(this.element);
            this._editor.getSession().setMode('ace/mode/glsl');

            // https://ace.c9.io/build/kitchen-sink.html
            // this._editor.getSession().setTheme();

            this._editor.$blockScrolling = Infinity;

            this.onChange = new ShaderTool.utils.Callback();

            var self = this;

            // TODO: Add debounce
            this._editor.on('change', function(){
            	self.onChange.call();
            });
        },
        getValue: function(){
            return this._editor.getSession().getValue();
        },
        setValue: function( value ){
            this._editor.getSession().setValue( value );
        },
        clear: function(){
            this.setValue('');
        },
        // future methods:
        lock: function(){},
        unlock: function(){},
        load: function( url ){}
    }

    return new Editor();
})();

ShaderTool.modules.Rendering = (function(){
		
	var VERTEX_SOURCE = 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}';

	function Rendering(){}
	Rendering.prototype = {
		init: function(){
			console.log('ShaderTool.modules.Rendering.init');

			this._canvas = document.getElementById('glcanvas');
			this._context = D3.createContextOnCanvas(this._canvas);

			var fragmentSource = 'precision mediump float;\n';
				fragmentSource += 'uniform sampler2D us2_source;\n';
				fragmentSource += 'uniform float uf_time;\n';
				fragmentSource += 'uniform vec2 uv2_resolution;\n';
				fragmentSource += 'void main() {\n';
				fragmentSource += '\tgl_FragColor = \n';
				//vec4(gl_FragCoord.xy / uv2_resolution, sin(uf_time), 1.);\n';
				fragmentSource += '\t\ttexture2D(us2_source, gl_FragCoord.xy / uv2_resolution);\n';
				fragmentSource += '}\n';

			this._program = this._context.createProgram({
				vertex: VERTEX_SOURCE,
				fragment: fragmentSource
			});

			this._buffer = this._context.createVertexBuffer().upload(new ShaderTool.utils.Float32Array([1,-1,1,1,-1,-1,-1,1]));

			this._resolution = null;
			this._texture = null;
			this._framebuffer = null;
			this._writePosition = 0;

			this._source = {
				program: this._program,
				attributes: {
					'av2_vtx': {
						buffer: this._buffer,
						size: 2,
						type: this._context.AttribType.Float,
						offset: 0
					}
				},
				uniforms: {
					'us2_source': this._context.UniformSampler(this._texture)
				},
				mode: this._context.Primitive.TriangleStrip,
				count: 4
			};

			this._rasterizers = [];
			this._rasterizers.push(new ShaderTool.classes.Rasterizer( this._context ));

			this._updateSource();
			ShaderTool.modules.Editor.onChange.add(this._updateSource, this);

			ShaderTool.modules.Ticker.onTick.add(this._render, this);
		},
		_updateSource: function(){
			var source = ShaderTool.modules.Editor.getValue();

			var totalRasterizers = this._rasterizers.length;
			for(var k=0; k<totalRasterizers; k++){
				var rasterizer = this._rasterizers[k];

				rasterizer.updateSource(source);
			}
		},
		_setResolution: function (width, height) {
			if (!this._resolution) {
				this._texture = [
					this._context.createTexture().uploadEmpty(this._context.TextureFormat.RGBA_8, width, height),
					this._context.createTexture().uploadEmpty(this._context.TextureFormat.RGBA_8, width, height)
				];
				framebuffer = [
					this._context.createFramebuffer().attachColor(this._texture[1]),
					this._context.createFramebuffer().attachColor(this._texture[0])
				];
			} else if (this._resolution[0] !== width || this._resolution[1] !== height) {
				this._texture[0].uploadEmpty(this._context.TextureFormat.RGBA_8, width, height);
				this._texture[1].uploadEmpty(this._context.TextureFormat.RGBA_8, width, height);
			}

			this._resolution = [width, height];
		},
		_getPreviousFrame: function () {
			return this._texture[this._writePosition];
		},
		_getResolution: function () {
			return this._resolution;
		},
		_getDestination: function () {
			return { framebuffer: framebuffer[this._writePosition] };
		},	
		_render: function( delta, elapsedTime ){

			// To seconds:
			delta = delta * 0.001;
			elapsedTime = elapsedTime * 0.001;

			if (this._canvas.clientWidth !== this._canvas.width ||
				this._canvas.clientHeight !== this._canvas.height) {

				var pixelFactor = window.devicePixelRatio || 1;

				this._canvas.width = this._canvas.clientWidth * pixelFactor;
				this._canvas.height = this._canvas.clientHeight * pixelFactor;

				this._setResolution(this._canvas.width, this._canvas.height);
			}

			var previosFrame = this._getPreviousFrame();
			var resolution = this._getResolution();
			var destination = this._getDestination();

			var totalRasterizers = this._rasterizers.length;
			for(var k=0; k<totalRasterizers; k++){
				var rasterizer = this._rasterizers[k];

				rasterizer.render(elapsedTime, previosFrame, resolution, destination);
			}
			
			if (!this._resolution) {
				return;
			}

			this._writePosition = (this._writePosition + 1) & 1;

			this._source.uniforms['uf_time'] = this._context.UniformFloat( elapsedTime );
			this._source.uniforms['uv2_resolution'] = this._context.UniformVec2( this._resolution );
			this._source.uniforms['us2_source'] = this._context.UniformSampler(this._texture[this._writePosition]);
			this._context.rasterize(this._source);
		}
	}

	return new Rendering();
})();

// Controls
ShaderTool.modules.Controls = (function(){
    function Controls(){}
    Controls.prototype = {
        init: function(){
            console.log('ShaderTool.modules.Controls.init');

            this._controls = [];

            this._initSceneControls();
        },
        _initSceneControls: function(){
            var playButton = document.getElementById('st-play');
            var pauseButton = document.getElementById('st-pause');
            var rewindButton = document.getElementById('st-rewind');
            var timescaleLabel = document.getElementById('st-timescale');
            var renderWidthLabel = document.getElementById('st-renderwidth');
            var renderHeightLabel = document.getElementById('st-renderheight');
            var sceneTimeLabel = document.getElementById('st-scenetime');

            var addUniformNameInput = document.getElementById('st-add-uniform-name');
            var addUniformTypeSelect = document.getElementById('st-add-uniform-type');
            var addUniformSubmit = document.getElementById('st-add-uniform-submit');
        }
    }
    return new Controls();
})();

ShaderTool.modules.ControlsFactory = (function(){
    function ControlsFactory(){}
    ControlsFactory.prototype = {
        init: function(){
            console.log('ShaderTool.modules.ControlsFactory.init');
            // 
        },
        create: function( type, handler ){
            if(type == ControlsFactory.FLOAT){
                return this._createFloat( handler );
            } else if(type == ControlsFactory.VEC2){
                return this._createVec2( handler );
            } else if(type == ControlsFactory.VEC3){
                return this._createVec3( handler );
            } else if(type == ControlsFactory.VEC4){
                return this._createVec4( handler );
            } else if(type == ControlsFactory.COLOR3){
                return this._createColor3( handler );
            } else if(type == ControlsFactory.COLOR4){
                return this._createColor4( handler );
            } else {
                throw new ShaderTool.Exception('Unknown uniform control type: ' + type);
                return null;
            }
        },
        _createFloat: function( handler ){

        },
        _createVec2: function( handler ){

        },
        _createVec3: function( handler ){

        },
        _createVec4: function( handler ){

        },
        _createColor3: function( handler ){

        },
        _createColor4: function( handler ){

        }
    }

    ControlsFactory.FLOAT = 'float';
    ControlsFactory.VEC2 = 'vec2';
    ControlsFactory.VEC3 = 'vec3';
    ControlsFactory.VEC4 = 'vec4';
    ControlsFactory.COLOR3 = 'color3';
    ControlsFactory.COLOR4 = 'color4';

    return new ControlsFactory();
})();

// classes
ShaderTool.classes.Rasterizer = (function(){
	var VERTEX_SOURCE = 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}';

	function Rasterizer( context ){
		this._context = context;

		this._program = null;
		this._prevProgram = null;
		this._buffer = this._context.createVertexBuffer().upload(new ShaderTool.utils.Float32Array([1,-1,1,1,-1,-1,-1,1]));

		this._source = {
			program: this._program,
			attributes: {
				'av2_vtx': {
					buffer: this._buffer,
					size: 2,
					type: this._context.AttribType.Float,
					offset: 0
				}
			},
			uniforms: {},
			mode: this._context.Primitive.TriangleStrip,
			count: 4
		};
	}
	Rasterizer.prototype = {
		updateSource: function (fragmentSource) {
			var savePrevProgramFlag = true;
			try{
				var newProgram = this._context.createProgram({
					vertex: VERTEX_SOURCE,
					fragment: fragmentSource
				});
				this._source.program = newProgram;
			} catch( e ){
				console.log('Error updating Rasterizer fragmentSource: ' + e);
				savePrevProgramFlag = false;

				if(this._prevProgram){
					this._source.program = this._prevProgram;
				}
			}

			if(savePrevProgramFlag){
				this._prevProgram = newProgram;
			}
		},
		render: function ( elapsedTime, frame, resolution, destination) {
			this._source.uniforms['us2_frame'] = this._context.UniformSampler(frame);
			this._source.uniforms['uv2_resolution'] = this._context.UniformVec2(resolution);
			this._source.uniforms['uf_time'] = this._context.UniformFloat( elapsedTime);
			this._context.rasterize(this._source, null, destination);
		}
	}
	return Rasterizer;
})();