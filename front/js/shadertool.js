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
        self.modules.FSHelper.init();
        self.modules.UniformControls.init();
        // self.modules.Controls.init();
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
        var str = Object.prototype.toString.call(object);
        return str == '[object Array]' || str == '[object Float32Array]';

        // return Object.prototype.toString.call(object) === '[object Array]';
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

    isNumberKey: function(e){
        var charCode = (e.which) ? e.which : e.keyCode;
        if (charCode == 46) {
            //Check if the text already contains the . character
            if (txt.value.indexOf('.') === -1) {
                return true;
            } else {
                return false;
            }
        } else {
            // if (charCode > 31 && (charCode < 48 || charCode > 57)){
            if(charCode > 31 && (charCode < 48 || charCode > 57) && !(charCode == 46 || charCode == 8)){
                if(charCode < 96 && charCode > 105){
                    return false;
                }
                
            }
        }
        return true;
    },
    toDecimalString: function( string ){
        if(this.isNumber(string)){
            return string;
        }

        if(string.substr(0,1) == '0'){
            if(string.substr(1,1) != '.'){
                string = '0.' + string.substr(1, string.length);
            }
        }

        return string == '0.' ? '0' : string;
    },
    /*
    hexToRgb: function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        ] : [];
    }
    */
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

ShaderTool.utils.DOMUtils = (function(){
    function addSingleEventListener(element, eventName, handler){
        if (element.addEventListener) {
            element.addEventListener(eventName, handler);
        } else {
            element.attachEvent('on' + eventName, function(e){
                handler.apply(element,[e]);
            });
        }
    }

    var tempDiv = document.createElement('div');

    function DOMUtils(){};
    DOMUtils.prototype = {
        addEventListener : function(element, eventName, handler){

            if(ShaderTool.utils.isArray(element)){

                var totalElements = element.length;
                for(var k=0; k<totalElements; k++){
                    this.addEventListener(element[k], eventName, handler);
                }

            } else {

                var eventName = ShaderTool.utils.isArray(eventName) ? eventName : eventName.split(' ').join('|').split(',').join('|').split('|');

                if(eventName.length > 1){

                    var totalEvents = eventName.length;
                    for(var k=0; k<totalEvents; k++){
                        addSingleEventListener(element, eventName[k], handler );
                    }
                } else {
                    addSingleEventListener(element, eventName[0], handler);
                }
            }
        },
        addClass : function(element, className){
            if (element.classList){
                element.classList.add(className);
            } else {
                element.className += SPACE + className;
            }
        },
        removeClass : function(element, className){
            if (element.classList){
                element.classList.remove(className);
            } else{
                element.className = element.className.replace(new RegExp('(^|\\b)' + className.split(SPACE).join('|') + '(\\b|$)', 'gi'), SPACE);
            }
        },
        injectCSS: function( cssText ){
            try{
                var styleElement = document.createElement('style');
                    styleElement.type = 'text/css';

                if (styleElement.styleSheet) {
                    styleElement.styleSheet.cssText = cssText;
                } else {
                    styleElement.appendChild(document.createTextNode(cssText));
                }
                document.getElementsByTagName('head')[0].appendChild(styleElement);

                return true;
            } catch( e ){
                return false;
            }
        },
        createFromHTML: function( html ){
            tempDiv.innerHTML = html.trim();
            var result = tempDiv.childNodes;
            if(result.length > 1){
                tempDiv.innerHTML = '<div>' + html.trim() + '<div/>'
                result = tempDiv.childNodes;
            }
            return result[0];
        }
    }
    return new DOMUtils();
})();


// Modules
// FSHelper
ShaderTool.modules.FSHelper = (function(){
    function FSHelper(){};
    FSHelper.prototype = {
        init: function(){

        },
        request: function( element ){
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullScreen) {
                element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        },
        exit: function(){
            if (document.cancelFullScreen) {
                document.cancelFullScreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        }
    }
    return new FSHelper();
})();

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

            this.reset = function(){
                elapsedTime = 0;
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
            this.getTime = function(){
                return elapsedTime;
            }
            function tickHandler( nowTime ){

                var delta = (nowTime - prevTime) * timeScale;
                prevTime = nowTime;

            	if(skippedFrames < maxSkipFrames){
            		skippedFrames++;
            	} else {
	                if(activeState){
                        elapsedTime += delta;

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

            this._container = document.getElementById('st-editor');

            this._editor = ace.edit(this._container);
            this._editor.getSession().setMode('ace/mode/glsl');

            // https://ace.c9.io/build/kitchen-sink.html
            // this._editor.getSession().setTheme();

            this._editor.$blockScrolling = Infinity;

            this.onChange = new ShaderTool.utils.Callback();

            var self = this;

            //this._editor.on('change', function(){
                //self.onChange.call();
            //});

            this._editor.on('change', ShaderTool.utils.throttle(function(){
                self.onChange.call();
            }, 1000 / 60 * 10));
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

			this._canvas = document.getElementById('st-canvas');
			this._context = D3.createContextOnCanvas(this._canvas);

            this._initSceneControls();

            // this._sourceChanged = true;

			var fragmentSource = 'precision mediump float;\n';
				fragmentSource += 'uniform sampler2D us2_source;\n';
				fragmentSource += 'uniform float uf_time;\n';
				fragmentSource += 'uniform vec2 uv2_resolution;\n';
				fragmentSource += 'void main() {\n';
				fragmentSource += '\tgl_FragColor = \n';
				// fragmentSource += 'vec4(gl_FragCoord.xy / uv2_resolution, sin(uf_time), 1.);\n';
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

            ShaderTool.modules.UniformControls.onChangeUniformList.add(this._updateSource, this);
            ShaderTool.modules.UniformControls.onChangeUniformValue.add(this._updateUniforms, this);

			ShaderTool.modules.Ticker.onTick.add(this._render, this);
		},
		_updateSource: function(){
            var uniformSource = ShaderTool.modules.UniformControls.getUniformsCode();
            var shaderSource = ShaderTool.modules.Editor.getValue();
            var fullSource = 'precision mediump float;\n\n' + uniformSource + '\n\n\n' + shaderSource;

            var totalRasterizers = this._rasterizers.length;
            for(var k=0; k<totalRasterizers; k++){
                var rasterizer = this._rasterizers[k];

                rasterizer.updateSource(fullSource);
            }

            this._updateUniforms();
		},
        _updateUniforms: function(){
            var uniforms = ShaderTool.modules.UniformControls.getUniformsData( this._context );

            var totalRasterizers = this._rasterizers.length;
            for(var k=0; k<totalRasterizers; k++){
                var rasterizer = this._rasterizers[k];
                rasterizer.updateUniforms(uniforms);
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
        _initSceneControls: function(){
            var self = this;

            this.dom = {};

            this.dom.playButton = document.getElementById('st-play');
            this.dom.pauseButton = document.getElementById('st-pause');
            this.dom.rewindButton = document.getElementById('st-rewind');
            this.dom.fullscreenButton = document.getElementById('st-fullscreen');
            this.dom.timescaleRange = document.getElementById('st-timescale');
            this.dom.renderWidthLabel = document.getElementById('st-renderwidth');
            this.dom.renderHeightLabel = document.getElementById('st-renderheight');
            this.dom.sceneTimeLabel = document.getElementById('st-scenetime');

            function setPlayingState( state ){
                if(state){
                    ShaderTool.modules.Ticker.start();

                    self.dom.playButton.style.display = 'none';
                    self.dom.pauseButton.style.display = '';
                } else {
                    ShaderTool.modules.Ticker.stop();

                    self.dom.playButton.style.display = '';
                    self.dom.pauseButton.style.display = 'none';
                }
            }

            ShaderTool.utils.DOMUtils.addEventListener(this.dom.playButton, 'mousedown', function( e ){
                e.preventDefault();
                setPlayingState( true );
            });

            ShaderTool.utils.DOMUtils.addEventListener(this.dom.pauseButton, 'mousedown', function( e ){
                e.preventDefault();
                setPlayingState( false );
            });

            ShaderTool.utils.DOMUtils.addEventListener(this.dom.rewindButton, 'mousedown', function( e ){
                e.preventDefault();
                ShaderTool.modules.Ticker.reset();
            });

            ShaderTool.utils.DOMUtils.addEventListener(this.dom.fullscreenButton, 'mousedown', function( e ){
                e.preventDefault();
                ShaderTool.modules.FSHelper.request(self._canvas);
            });            
            ShaderTool.utils.DOMUtils.addEventListener(this._canvas, 'dblclick', function( e ){
                e.preventDefault();
                ShaderTool.modules.FSHelper.exit();
            }); 

            this.dom.timescaleRange.setAttribute('step', '0.001');
            this.dom.timescaleRange.setAttribute('min', '0.001');
            this.dom.timescaleRange.setAttribute('max', '10');
            this.dom.timescaleRange.setAttribute('value', '1');

            ShaderTool.utils.DOMUtils.addEventListener(this.dom.timescaleRange, 'input change', function( e ){
                ShaderTool.modules.Ticker.timeScale( parseFloat(self.dom.timescaleRange.value) )
            });


            setPlayingState( true );
        },
		_render: function( delta, elapsedTime ){

			// To seconds:
			delta = delta * 0.001;
			elapsedTime = elapsedTime * 0.001;

            this.dom.sceneTimeLabel.innerHTML = elapsedTime.toFixed(2);;

			if (this._canvas.clientWidth !== this._canvas.width ||
				this._canvas.clientHeight !== this._canvas.height) {

				var pixelRatio = window.devicePixelRatio || 1;

				var cWidth = this._canvas.width = this._canvas.clientWidth * pixelRatio;
				var cHeight = this._canvas.height = this._canvas.clientHeight * pixelRatio;

				this._setResolution(cWidth, cHeight);

                this.dom.renderWidthLabel.innerHTML = cWidth + 'px';
                this.dom.renderHeightLabel.innerHTML = cHeight + 'px';
			}

			var previosFrame = this._texture[this._writePosition];
			var resolution = this._resolution;
			var destination = { framebuffer: framebuffer[this._writePosition] };

			var totalRasterizers = this._rasterizers.length;
			for(var k=0; k<totalRasterizers; k++){
				var rasterizer = this._rasterizers[k];

				rasterizer.render(elapsedTime, previosFrame, resolution, destination);
			}
			
			if (!this._resolution) {
				return;
			}

			this._writePosition = (this._writePosition + 1) & 1;


            // this._source.uniforms = ShaderTool.modules.UniformControls.getUniformsData();

            this._source.uniforms['uf_time'] = this._context.UniformFloat( elapsedTime );
            this._source.uniforms['uv2_resolution'] = this._context.UniformVec2( this._resolution );
            this._source.uniforms['us2_source'] = this._context.UniformSampler( this._texture[this._writePosition] );

            /*
			this._source.uniforms['uf_time'] = this._context.UniformFloat( elapsedTime );
			this._source.uniforms['uv2_resolution'] = this._context.UniformVec2( this._resolution );
			this._source.uniforms['us2_source'] = this._context.UniformSampler(this._texture[this._writePosition]);

            var uniformsData = ShaderTool.modules.UniformControls.getUniformsData();
            for(var i in uniformsData){
                this._source.uniforms[i] = uniformsData[i];
            }
            */

			this._context.rasterize(this._source);
		}
	}

	return new Rendering();
})();

// Controls
ShaderTool.modules.UniformControls = (function(){

    function UniformControls(){}
    UniformControls.prototype = {
        init: function(){
            console.log('ShaderTool.modules.UniformControls.init');

            this.onChangeUniformList = new ShaderTool.utils.Callback();
            this.onChangeUniformValue = new ShaderTool.utils.Callback();

            this._changed = true;

            this._callChangeUniformList = function(){
                this._changed = true;
                this.onChangeUniformList.call();
            }
            this._callChangeUniformValue = function(){
                this._changed = true;
                this.onChangeUniformValue.call();
            }

            this._container = document.getElementById('st-uniforms-container');

            this._controls = [];
            this._uniforms = {};

            this._createMethods = {};
            this._createMethods[UniformControls.FLOAT] = this._createFloat;
            this._createMethods[UniformControls.VEC2] = this._createVec2;
            this._createMethods[UniformControls.VEC3] = this._createVec3;
            this._createMethods[UniformControls.VEC4] = this._createVec4;
            this._createMethods[UniformControls.COLOR3] = this._createColor3;
            this._createMethods[UniformControls.COLOR4] = this._createColor4;

            // Templates:
            this._templates = {};
            var totalTypes = UniformControls.TYPES.length;

            for(var k=0; k<totalTypes; k++){
                var type = UniformControls.TYPES[k]
                var templateElement = document.getElementById('st-template-control-' + type);
                if(templateElement){
                    this._templates[type] = templateElement.innerHTML;
                    templateElement.parentNode.removeChild(templateElement);
                } else {
                    console.warn('No template html for ' + type + ' type!');
                }
            }

            this._container.innerHTML = ''; // Clear container

            // Tests:
            /*
            for(var k=0; k<totalTypes; k++){
                this._createControl('myControl' + (k+1), UniformControls.TYPES[k], null, true );
            }
            */

            //uniform float slide;
            //uniform vec3 color1;
            this._createControl('slide', UniformControls.FLOAT, [{max: 10, value: 10}], true );
            // this._createControl('color1', UniformControls.COLOR3, null, true );
            this._createControl('color1', UniformControls.VEC3, [{value:1},{},{}], true );

            this._createControl('test', UniformControls.FLOAT, null, true );
            this._createControl('test2', UniformControls.FLOAT, [{value: 1}], true );
            this._createControl('test3', UniformControls.FLOAT, [{ value: 1 }], true );

            //
            this._initCreateControls();

            //this._callChangeUniformList();
            //this._callChangeUniformValue();
        },

        /* Public methods */
        getUniformsCode: function(){
            var result = [];
            var totalControls = this._controls.length;
            for(var k=0; k<totalControls; k++){
                result.push(this._controls[k].code);
            }
            return result.join('\n');
        },

        getUniformsData: function( context ){
            if(!this._changed){
                return this._uniforms;
            }
            this._changed = false;

            this._uniforms = {};
            
            var totalControls = this._controls.length;
            for(var k=0; k<totalControls; k++){
                var control = this._controls[k];
                var value = control.getUniformValue();

                if(control.type == UniformControls.FLOAT){
                    this._uniforms[control.name] = context.UniformFloat(value);

                } else if(control.type == UniformControls.VEC2){
                    this._uniforms[control.name] = context.UniformVec2(value);

                } else if(control.type == UniformControls.VEC3 || control.type == UniformControls.COLOR3){
                    this._uniforms[control.name] = context.UniformVec3(value);

                } else if(control.type == UniformControls.VEC4 || control.type == UniformControls.COLOR4){
                    this._uniforms[control.name] = context.UniformVec4(value);

                }
            }

            return this._uniforms;

            return this._uniforms
        },

        getData: function(){
            var uniforms = [];

            var totalControls = this._controls.length;
            for(var k=0; k<totalControls; k++){
                var control = this._controls[k];

                uniforms.push({
                    name: control.name,
                    type: control.type,
                    data: control.getData() // [{value: 11.02, min: 0, max: 100}, ... ]
                })
            }

            console.log(uniforms)
        },
        setData: function( uniforms ){

        },

        /* Private methods */
        _checkNewUniformName: function( name ){
            // TODO;
            return name != '';
        },
        _initCreateControls: function(){
            var addUniformNameInput = document.getElementById('st-add-uniform-name');
            var addUniformTypeSelect = document.getElementById('st-add-uniform-type');
            var addUniformSubmit = document.getElementById('st-add-uniform-submit');
            var self = this;

            ShaderTool.utils.DOMUtils.addEventListener(addUniformSubmit, 'mousedown', function( e ){
                e.preventDefault();
                
                var name = addUniformNameInput.value;

                if( !self._checkNewUniformName(name) ){
                    // TODO: Show info about incorrect uniforn name?

                    addUniformNameInput.focus();
                } else {
                    var type = addUniformTypeSelect.value;
                    self._createControl( name, type, null, false );

                    addUniformNameInput.value = '';
                }
            });
        },

        _createControl: function( name, type, initialData, skipCallChangeFlag ){
            var self = this;
            var control;
            var elementTemplate = this._templates[type];

            if( typeof elementTemplate == 'undefined' ){
                console.error('No control template for type ' + type);
                return;
            }

            var element = ShaderTool.utils.DOMUtils.createFromHTML(elementTemplate);

            var createMethod = this._createMethods[type];
            if( createMethod ){
                initialData = ShaderTool.utils.isArray(initialData) ? initialData : [];

                control = createMethod.apply(this, [name, element, initialData] );
            } else {
                throw new ShaderTool.Exception('Unknown uniform control type: ' + type);
                return null;
            }

            control.name = name;
            control.type = type;

            this._controls.push(control);
            this._container.appendChild(element);

            // name element
            var nameElement = element.querySelector('[data-uniform-name]');
            if(nameElement){
                nameElement.setAttribute('title', 'Uniform ' + name + ' settings');
                nameElement.innerHTML = name;

                ShaderTool.utils.DOMUtils.addEventListener(nameElement, 'dblclick', function( e ){
                    e.preventDefault();
                    alert('Show uniform rename dialog?')
                });
            }

            // delete element
            var deleteElement = element.querySelector('[data-uniform-delete]');
            if(deleteElement){
                ShaderTool.utils.DOMUtils.addEventListener(deleteElement, 'click', function( e ){
                    e.preventDefault();

                    if (confirm('Delete uniform?')) {
                        self._removeControl( control );
                        self._container.removeChild( element );
                    }

                });
            }

            if(!skipCallChangeFlag){
                this._callChangeUniformList();
            }
        },
        _removeControl: function( control, skipCallChangeFlag ){
            var totalControls = this._controls.length;
            for(var k=0; k<totalControls; k++){
                if(this._controls[k] === control){
                    this._controls.splice(k, 1);
                    break;
                }
            }
            if(!skipCallChangeFlag){
                this._callChangeUniformList();
            }
        },
        _clearControls: function(skipCallChangeFlag){
            while(this._controls.length){
                this._removeControl(this._controls.length-1, true);
            }
            if(!skipCallChangeFlag){
                this._callChangeUniformList();
            }
        },

        _createFloat: function( name, element, initialData ){
            
            var self = this;

            var saveData = [ this._prepareRangeData( initialData[0]) ];

            var uniformValue = saveData[0].value;

            this._initRangeElementGroup(element, '1', saveData[0], function( value, min, max ){
                uniformValue = value;

                var dataObject = saveData[0];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });

            return {
                code: 'uniform float ' + name + ';',

                getUniformValue: function(){
                    return uniformValue;
                },
                getData: function(){
                    return saveData;
                }
            }
        },
        _createVec2: function( name, element, initialData ){
            var self = this;
            
            var saveData = [
                            this._prepareRangeData( initialData[0] ),
                            this._prepareRangeData( initialData[1] )
                            ];

            var uniformValue = [saveData[0].value, saveData[1].value];

            this._initRangeElementGroup(element, '1', saveData[0], function( value, min, max ){
                uniformValue[0] = value;

                var dataObject = saveData[0];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '2', saveData[1], function( value, min, max ){
                uniformValue[1] = value;

                var dataObject = saveData[1];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });

            return {
                code: 'uniform vec2 ' + name + ';',

                getUniformValue: function(){
                    return uniformValue;
                },
                getData: function(){
                    return saveData;
                }
            }
        },
        _createVec3: function( name, element, initialData ){
            var self = this;

            var saveData = [
                            this._prepareRangeData( initialData[0] ),
                            this._prepareRangeData( initialData[1] ),
                            this._prepareRangeData( initialData[2] )
                            ];

            var uniformValue = [saveData[0].value, saveData[1].value, saveData[2].value];

            this._initRangeElementGroup(element, '1', saveData[0], function( value, min, max ){
                uniformValue[0] = value;

                var dataObject = saveData[0];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '2', saveData[1], function( value, min, max ){
                uniformValue[1] = value;

                var dataObject = saveData[1];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '3', saveData[2], function( value, min, max ){
                uniformValue[2] = value;

                var dataObject = saveData[2];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });

            return {
                code: 'uniform vec3 ' + name + ';',

                getUniformValue: function(){
                    return uniformValue;
                },
                getData: function(){
                    return saveData;
                }
            }
        },
        _createVec4: function( name, element, initialData ){
            var self = this;

            var saveData = [
                            this._prepareRangeData( initialData[0] ),
                            this._prepareRangeData( initialData[1] ),
                            this._prepareRangeData( initialData[2] ),
                            this._prepareRangeData( initialData[3] )
                            ];

            var uniformValue = [saveData[0].value, saveData[1].value, saveData[2].value, saveData[3].value];

            this._initRangeElementGroup(element, '1', saveData[0], function( value, min, max ){
                uniformValue[0] = value;

                var dataObject = saveData[0];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '2', saveData[1], function( value, min, max ){
                uniformValue[1] = value;     

                var dataObject = saveData[1];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '3', saveData[2], function( value, min, max ){
                uniformValue[2] = value;

                var dataObject = saveData[2];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '4', saveData[3], function( value, min, max ){
                uniformValue[3] = value;

                var dataObject = saveData[3];
                    dataObject.value = value;
                    dataObject.min = min;
                    dataObject.max = max;

                self._callChangeUniformValue();
            });

            return {
                code: 'uniform vec4 ' + name + ';',

                getUniformValue: function(){
                    return uniformValue;
                },
                getData: function(){
                    return saveData;
                }
            }
        },
        _createColor3: function( name, element, initialData ){

            var saveData = [{}];

            var self = this;
            var uniformValue = this._initColorSelectElementGroup( element, false, function( value ){
                uniformValue = value;

                var dataObject = saveData[0];
                dataObject.value = value;

                self._callChangeUniformValue();
            })
            
            return {
                code: 'uniform vec3 ' + name + ';',
                //getUniformCode: function(){
                //    return 'uniform vec3 ' + name + ';'
                //},
                getUniformValue: function(){
                    return uniformValue;
                },
                getData: function(){
                    return saveData;
                }
            }
        },
        _createColor4: function( name, element, initialData ){
            var saveData = [{}];

            var self = this;
            var uniformValue = this._initColorSelectElementGroup( element, true, function( value ){
                uniformValue = value;

                var dataObject = saveData[0];
                dataObject.value = value;

                self._callChangeUniformValue();
            })

            return {
                code: 'uniform vec4 ' + name + ';',
                //getUniformCode: function(){
                //    return 'uniform vec4 ' + name + ';'
                //},
                getUniformValue: function(){
                    return uniformValue;
                },
                getData: function(){
                    return saveData;
                }
            }
        },

        _prepareRangeData: function( inputData ){
            inputData = typeof inputData == 'undefined' ? {} : inputData;
            var resultData = {
                value: 0,
                min: 0,
                max: 1
            };

            for(var i in resultData){
                if(typeof inputData[i] != 'undefined'){
                    resultData[i] = inputData[i];
                }
            }

            return resultData;
        },
        _initColorSelectElementGroup: function( element, useAlpha, changeHandler ){
            var colorElement = element.querySelector('[data-color]');

            var value = [0,0,0];

            if(useAlpha){
                value[3] = 1;
            }

            function callHandler(){
                changeHandler && changeHandler( value );
            }

            ShaderTool.utils.DOMUtils.addEventListener(colorElement, 'change', function( e ){
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorElement.value);

                value[0] = parseInt(result[1], 16) / 256;
                value[1] = parseInt(result[2], 16) / 256;
                value[2] = parseInt(result[3], 16) / 256;

                callHandler();
            });

            if(useAlpha){
                var rangeElement = element.querySelector('[data-range]');

                rangeElement.setAttribute('min', '0');
                rangeElement.setAttribute('max', '1');
                rangeElement.setAttribute('step', '0.001');
                rangeElement.setAttribute('value', '1');

                ShaderTool.utils.DOMUtils.addEventListener(rangeElement, 'input change', function( e ){
                    value[3] = parseInt(rangeElement.value);
                    callHandler();
                })
            }

            return value;
        },
        _initRangeElementGroup: function( element, attrIndex, initialData, changeHandler, stepValue ){
            var minValue = initialData.min;
            var maxValue = initialData.max;

            var minElement = element.querySelector('[data-range-min-' + attrIndex + ']');// || document.createElement('input');
            var maxElement = element.querySelector('[data-range-max-' + attrIndex + ']');// || document.createElement('input');
            var rangeElement = element.querySelector('[data-range-' + attrIndex + ']');
            var valueElement = element.querySelector('[data-range-value-' + attrIndex + ']') || document.createElement('div');

                rangeElement.setAttribute('step', typeof stepValue != 'undefined' ? stepValue : '0.0001');

            var prevMinValue;
            var prevMaxValue;    


            minElement.setAttribute('title', 'Minimum value');
            maxElement.setAttribute('title', 'Maximum value');  

            prevMinValue = minElement.value = valueElement.innerHTML = minValue;
            prevMaxValue = maxElement.value = maxValue;

            rangeElement.value = initialData.value;   

            ShaderTool.utils.DOMUtils.addEventListener(rangeElement, 'input change', function( e ){

                if(minElement.value == ''){
                    minElement.value = prevMinValue;
                }
                if(maxElement.value == ''){
                    maxElement.value = prevMaxValue;
                }

                if(minValue > maxValue){
                    prevMinValue = minElement.value = maxValue;
                    prevMaxValue = maxElement.value = minValue;
                }

                valueElement.innerHTML = rangeElement.value;

                changeHandler( parseFloat(rangeElement.value), minValue, maxValue );
            });

            function updateRangeSettings(){
                if(minElement.value == '' || maxElement.value == ''){
                    return;
                }

                prevMinValue = minElement.value;
                prevMaxValue = maxElement.value;

                minValue = ShaderTool.utils.toDecimalString(minElement.value);
                maxValue = ShaderTool.utils.toDecimalString(maxElement.value);

                var min = minValue = parseFloat(minValue);
                var max = maxValue = parseFloat(maxValue);

                if(min > max){
                    max = [min, min = max][0];
                }

                rangeElement.setAttribute('min', min);
                rangeElement.setAttribute('max', max);
            }

            ShaderTool.utils.DOMUtils.addEventListener([minElement, maxElement], 'keydown input change', function( e ){
                if(!ShaderTool.utils.isNumberKey( e )){
                    e.preventDefault();
                    return false;
                }
                updateRangeSettings();
            });

            updateRangeSettings();
        }
    }

    UniformControls.FLOAT = 'float';
    UniformControls.VEC2 = 'vec2';
    UniformControls.VEC3 = 'vec3';
    UniformControls.VEC4 = 'vec4';
    UniformControls.COLOR3 = 'color3';
    UniformControls.COLOR4 = 'color4';
    UniformControls.TYPES = [UniformControls.FLOAT, UniformControls.VEC2, UniformControls.VEC3, UniformControls.VEC4, UniformControls.COLOR3, UniformControls.COLOR4];

    return new UniformControls();
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
				console.log('Error updating Rasterizer fragmentSource: ' + e.message);
				savePrevProgramFlag = false;

				if(this._prevProgram){
					this._source.program = this._prevProgram;
				}
			}
			if(savePrevProgramFlag){
				this._prevProgram = newProgram;
			}
		},
        updateUniforms: function(uniforms){
            this._source.uniforms = uniforms;
        },
		render: function ( elapsedTime, frame, resolution, destination ) {
			this._source.uniforms['us2_frame'] = this._context.UniformSampler( frame );
			this._source.uniforms['uv2_resolution'] = this._context.UniformVec2( resolution );
			this._source.uniforms['uf_time'] = this._context.UniformFloat( elapsedTime);
			this._context.rasterize(this._source, null, destination);
		}
	}
	return Rasterizer;
})();