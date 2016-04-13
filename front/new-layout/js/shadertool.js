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
    this.elements = {};

    var self = this;
    catchReady(function(){
        self.modules.Ticker.init();
        self.modules.GUIHelper.init();
        self.modules.Editor.init();
        // self.modules.Presenter.init();
        // self.modules.Renderer.init();
        self.modules.Rendering.init();

        /*
        // Apply logic
        // TODO: Move logic to Renderer
        self.modules.Editor.onChange.add(function(){
            var newValue = self.modules.Editor.getValue();

            var uniforms = self.modules.Renderer.updateSource(newValue);
            // self.modules.Controls.updateControls(uniforms);
        });
        */

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

        add: function(handler) {
            if (typeof handler != 'function') {
                this._throwError();
                return;
            }

            this.remove(handler);
            this._handlers.push(handler);
        },

        remove: function(handler) {
            if (typeof handler != 'function') {
                this._throwError();
                return;
            }

            var totalHandlers = this._handlers.length;
            for (var k = 0; k < totalHandlers; k++) {
                if (handler === this._handlers[k]) {
                    this._handlers.splice(k, 1);
                    return;
                }
            }
        },

        call: function() {
            var totalHandlers = this._handlers.length;
            for (var k = 0; k < totalHandlers; k++) {
                var handler = this._handlers[k];
                handler.apply(null, arguments);
            }
        }
    };

    return Callback;
})();

ShaderTool.utils.Float32Array = (function(){
    return typeof Float32Array === 'function' ? Float32Array : Array;
})();

// Modules
/*
ShaderTool.modules.WindowHelper = (function(){
    function WindowHelper(){}
})();
*/
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

                if(activeState){
                    self.onTick.call(delta, elapsedTime)
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
            return this._editor.getValue();
        },
        setValue: function( value ){
            this._editor.setValue( value );
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

/*
// Renderer
ShaderTool.modules.Renderer = (function(){
    function Renderer(){}

    Renderer.prototype = {
        init: function(){
            console.log('ShaderTool.modules.Renderer.init');

            this.canvas = document.getElementById('glcanvas');

            this._timeScale = 1;
            this._rendering = false;

            // TODO: Optimize
            try{
                // Passed object is a future settings for context     ↓
                this._context = D3.createContextOnCanvas(this.canvas, {});

            } catch ( e ){
                ShaderTool.modules.GUIHelper.showError('Could not init D3.Context: ' + e)
            }

            this._buffer = this._context.createVertexBuffer().upload(new ShaderTool.utils.Float32Array([1,-1,1,1,-1,-1,-1,1]));
            this._vertexSource = 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}';
            this._programm = null;

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

            ShaderTool.modules.Ticker.onTick.add(this.render, this);
            this.startRendering();
        },
        startRendering: function(){
            if(this._rendering){
                return;
            }
            this._rendering = true;
        },
        stopRendering: function(){
            if(!this._rendering){
                return;
            }
            this._rendering = false;
        },
        updateSource: function( fragmentSource ){ // ← Add vertexSource here?
            var newProgram = this._context.createProgram({
                vertex: this._vertexSource,
                fragment: fragmentSource
            });
            this._source.program = newProgram;

            var unimatch = /^\s*uniform\s+(float|vec2|vec3|vec4)\s+([a-zA-Z]*[-_a-zA-Z0-9]).*\/\/(slide|color)({.*})/gm;
            var uniforms = [];
        },
        render: function( delta, elapsedTime ){
            if(!this._rendering){
                return;
            }

            if (this.canvas.clientWidth !== this.canvas.width ||
                this.canvas.clientHeight !== this.canvas.height) {

                var pixelFactor = window.devicePixelRatio;

                this.canvas.width = this.canvas.clientWidth * pixelFactor;
                this.canvas.height = this.canvas.clientHeight * pixelFactor;

                presenter.setResolution(this.canvas.width, this.canvas.height);
            }

            // TODO: Optimize
            var frame = presenter.getPreviousFrame()
            var resolution = presenter.getResolution()
            var destination = presenter.getDestination()
            var time = elapsedTime; //ms

            this._source.uniforms['us2_frame'] = this._context.UniformSampler(frame);
            this._source.uniforms['uv2_resolution'] = this._context.UniformVec2(resolution);
            this._source.uniforms['uf_time'] = this._context.UniformFloat(time);
            this._context.rasterize(source, null, destination);

            presenter.present(time);

            console.log('render')
        }
    }

    return new Renderer();
})();


*/
ShaderTool.modules.Rendering = (function(){
	function Rendering(){}
	Rendering.prototype = {
		init: function(){
			console.log('ShaderTool.modules.Rendering.init');
		}
	}

	return new Rendering();
})();

// Elements
ShaderTool.elements.Rasterizer = (function(){
	var VERTEX_SOURCE = 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}';

	function Rasterizer( context ){
		this._context = context;

		this._program = null;
		this._buffer = this._context.createVertexBuffer().upload(new ShaderTool.util.Float32Array([1,-1,1,1,-1,-1,-1,1]));

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
			var newProgram = this._context.createProgram({
				vertex: VERTEX_SOURCE,
				fragment: fragmentSource
			});
			source.program = newProgram;

			/*
			var unimatch = /^\s*uniform\s+(float|vec2|vec3|vec4)\s+([a-zA-Z]*[-_a-zA-Z0-9]).*\/\/(slide|color)({.*})/gm;
			var uniforms = [];

			for (;;) {
				uniform = unimatch.exec(fragmentSource);
				if (!uniform) {
					break;
				}

				try {
					uniforms.push({
						type: uniform[1],
						name: uniform[2],
						kind: uniform[3],
						settings: JSON.parse(uniform[4]),
						handler: (
							function (typename, name) {
								var type;
								if (typename === 'float') {
									type = this._context.UniformFloat;
								} else if (typename === 'vec2') {
									type = this._context.UniformVec2;
								} else if (typename === 'vec3') {
									type = this._context.UniformVec3;
								} else if (typename === 'vec4') {
									type = this._context.UniformVec4;
								}
								return function (value) {
									console.log(value);
									source.uniforms[name] = type(value);
								};

						})(uniform[1], uniform[2])
					});
				} catch (e) {
					console.log(e);
				}
			}

			return uniforms;*/
		},
		render: function (time, frame, resolution, destination) {
			this._source.uniforms['us2_frame'] = this._context.UniformSampler(frame);

			this._source.uniforms['uv2_resolution'] = this._context.UniformVec2(resolution);

			this._source.uniforms['uf_time'] = this._context.UniformFloat(time);

			this._context.rasterize(this._source, null, destination);
		}
	}
	return Rasterizer;
})();