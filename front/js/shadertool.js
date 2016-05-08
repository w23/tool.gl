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
    this.helpers = {};
    this.classes = {};

    var self = this;
    catchReady(function(){

        self.modules.GUIHelper.init();
        self.modules.UniformControls.init();
        self.modules.Editor.init();
        self.modules.Rendering.init();
        self.modules.SaveController.init();
        self.modules.PopupManager.init();

        document.documentElement.className = '_ready';
    });

})();

// Utils
ShaderTool.Utils = {
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
        if( this.isArray(object) ){
            return true
        }
        if( typeof object.length == 'number' && typeof object[0] != 'undefined' && typeof object[object.length] != 'undefined'){
            return true;
        }
        return false;
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
ShaderTool.Utils.Callback = (function(){
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

ShaderTool.Utils.Float32Array = (function(){
    return typeof Float32Array === 'function' ? Float32Array : Array;
})();

ShaderTool.Utils.DOMUtils = (function(){
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

            if(ShaderTool.Utils.isArrayLike(element)){

                var totalElements = element.length;
                for(var k=0; k<totalElements; k++){
                    this.addEventListener(element[k], eventName, handler);
                }

            } else {

                var eventName = ShaderTool.Utils.isArray(eventName) ? eventName : eventName.split(' ').join('|').split(',').join('|').split('|');

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


// Helpers
// LSHelper
ShaderTool.helpers.LSHelper = (function(){
    var ALLOW_WORK = window.localStorage != null || window.sessionStorage != null;

    function LSHelper(){
        this._storage = window.localStorage || window.sessionStorage;
    }
    LSHelper.prototype = {
        setItem: function( key, data ){
            if( !ALLOW_WORK ){ return null }

            var json = JSON.stringify(data)
            this._storage.setItem( key, json );

            return json;
        },
        getItem: function( key ){
            if( !ALLOW_WORK ){ return null }

            return JSON.parse(this._storage.getItem( key ))
        },
        clearItem: function( key ){
            if( !ALLOW_WORK ){ return null }

            this._storage.removeItem( key )
        }
    }
    return new LSHelper();
})();

// FSHelper
ShaderTool.helpers.FSHelper = (function(){
    function FSHelper(){};
    FSHelper.prototype = {
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
ShaderTool.helpers.Ticker = (function(){
    var raf;
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];

    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
    if (!window.requestAnimationFrame){
        raf = function( callback ) {
            var currTime = Utils.now();
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

    function Ticker(){

        this.onTick = new ShaderTool.Utils.Callback();

        var activeState = true;
        var applyArgs = [];
        var listeners = [];
        var prevTime = ShaderTool.Utils.now();
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
            if(ShaderTool.Utils.isSet(value)){ timeScale = value; }
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
    };
    return new Ticker();
})();



// Modules
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

            this.onChange = new ShaderTool.Utils.Callback();

            var self = this;

            //this._editor.on('change', function(){
                //self.onChange.call();
            //});
            this._editor.on('change', ShaderTool.Utils.throttle(function(){

                if(!self._skipCallChange){
                    self.onChange.call();
                }
            }, 1000 / 60 * 10));
        },
        getData: function(){
            return this._editor.getSession().getValue();
        },
        setData: function( value, skipCallChangeFlag ){

            this._skipCallChange = skipCallChangeFlag;
            this._editor.getSession().setValue( value );
            this._skipCallChange = false;

            if(!skipCallChangeFlag){
                this.onChange.call();
            }
        },
        clear: function(){
            this.setValue('');
        },
        // future methods:
        //lock: function(){},
        //unlock: function(){},
        //load: function( url ){}
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

            this.onChange = new ShaderTool.Utils.Callback();

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

			this._buffer = this._context.createVertexBuffer().upload(new ShaderTool.Utils.Float32Array([1,-1,1,1,-1,-1,-1,1]));

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

			// this._updateSource();

			ShaderTool.modules.Editor.onChange.add(this._updateSource, this);

            ShaderTool.modules.UniformControls.onChangeUniformList.add(this._updateSource, this);
            ShaderTool.modules.UniformControls.onChangeUniformValue.add(this._updateUniforms, this);

			ShaderTool.helpers.Ticker.onTick.add(this._render, this);
		},
		_updateSource: function( skipCallChangeFlag ){
            var uniformSource = ShaderTool.modules.UniformControls.getUniformsCode();
            var shaderSource = ShaderTool.modules.Editor.getData();
            var fullSource = 'precision mediump float;\n\n' + uniformSource + '\n\n\n' + shaderSource;

            var totalRasterizers = this._rasterizers.length;
            for(var k=0; k<totalRasterizers; k++){
                var rasterizer = this._rasterizers[k];

                rasterizer.updateSource(fullSource);
            }

            this._updateUniforms( skipCallChangeFlag );
		},
        _updateUniforms: function( skipCallChangeFlag ){
            var uniforms = ShaderTool.modules.UniformControls.getUniformsData( this._context );

            var totalRasterizers = this._rasterizers.length;
            for(var k=0; k<totalRasterizers; k++){
                var rasterizer = this._rasterizers[k];
                rasterizer.updateUniforms(uniforms);
            }
            if(!skipCallChangeFlag){
                this.onChange.call();
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
                    ShaderTool.helpers.Ticker.start();

                    self.dom.playButton.style.display = 'none';
                    self.dom.pauseButton.style.display = '';
                } else {
                    ShaderTool.helpers.Ticker.stop();

                    self.dom.playButton.style.display = '';
                    self.dom.pauseButton.style.display = 'none';
                }
            }

            ShaderTool.Utils.DOMUtils.addEventListener(this.dom.playButton, 'mousedown', function( e ){
                e.preventDefault();
                setPlayingState( true );
            });

            ShaderTool.Utils.DOMUtils.addEventListener(this.dom.pauseButton, 'mousedown', function( e ){
                e.preventDefault();
                setPlayingState( false );
            });

            ShaderTool.Utils.DOMUtils.addEventListener(this.dom.rewindButton, 'mousedown', function( e ){
                e.preventDefault();
                ShaderTool.helpers.Ticker.reset();
            });

            ShaderTool.Utils.DOMUtils.addEventListener(this.dom.fullscreenButton, 'mousedown', function( e ){
                e.preventDefault();
                ShaderTool.helpers.FSHelper.request(self._canvas);
            });            
            ShaderTool.Utils.DOMUtils.addEventListener(this._canvas, 'dblclick', function( e ){
                e.preventDefault();
                ShaderTool.helpers.FSHelper.exit();
            }); 

            this.dom.timescaleRange.setAttribute('step', '0.001');
            this.dom.timescaleRange.setAttribute('min', '0.001');
            this.dom.timescaleRange.setAttribute('max', '10');
            this.dom.timescaleRange.setAttribute('value', '1');

            ShaderTool.Utils.DOMUtils.addEventListener(this.dom.timescaleRange, 'input change', function( e ){
                ShaderTool.helpers.Ticker.timeScale( parseFloat(self.dom.timescaleRange.value) )
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

            this._source.uniforms['uf_time'] = this._context.UniformFloat( elapsedTime );
            this._source.uniforms['uv2_resolution'] = this._context.UniformVec2( this._resolution );
            this._source.uniforms['us2_source'] = this._context.UniformSampler( this._texture[this._writePosition] );

			this._context.rasterize(this._source);
		},

        getData: function(){
            return {
                uniforms: ShaderTool.modules.UniformControls.getData(),
                source: ShaderTool.modules.Editor.getData()           
            }
        },
        setData: function( data, skipCallChangeFlag ){

            ShaderTool.modules.UniformControls.setData( data.uniforms, true );
            ShaderTool.modules.Editor.setData( data.source, true );
            
            this._updateSource( skipCallChangeFlag );

            ShaderTool.helpers.Ticker.reset();

            if(!skipCallChangeFlag){
                this.onChange.call();
            }
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

            this.onChangeUniformList = new ShaderTool.Utils.Callback();
            this.onChangeUniformValue = new ShaderTool.Utils.Callback();

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
            

            //uniform float slide;
            //uniform vec3 color1;
            this._createControl('slide', UniformControls.FLOAT, [{max: 10, value: 10}], true );
            // this._createControl('color1', UniformControls.COLOR3, null, true );
            this._createControl('color1', UniformControls.VEC3, [{value:1},{},{}], true );

            this._createControl('test', UniformControls.FLOAT, null, true );
            this._createControl('test2', UniformControls.FLOAT, [{value: 1}], true );
            this._createControl('test3', UniformControls.FLOAT, [{ value: 1 }], true );

            //
            

            //this._callChangeUniformList();
            //this._callChangeUniformValue();
            */

            this._initCreateControls();
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
        },

        getData: function(){
            var uniforms = [];

            var totalControls = this._controls.length;
            for(var k=0; k<totalControls; k++){
                var control = this._controls[k];

                uniforms.push({
                    name: control.name,
                    type: control.type,
                    data: control.data
                })
            }

            return uniforms;
        },
        setData: function( uniforms, skipCallChangeFlag){
            this._clearControls( skipCallChangeFlag );

            // TODO;
            var totalUniforms = uniforms.length;
            for(var k=0; k<totalUniforms; k++){
                var uniformData = uniforms[k];

                this._createControl(uniformData.name, uniformData.type, uniformData.data, true)
            }

            if(!skipCallChangeFlag){
                this._callChangeUniformList();
            }
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

            ShaderTool.Utils.DOMUtils.addEventListener(addUniformSubmit, 'click', function( e ){
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

            this._changed = true;

            var self = this;
            var control;
            var elementTemplate = this._templates[type];

            if( typeof elementTemplate == 'undefined' ){
                console.error('No control template for type ' + type);
                return;
            }

            var element = ShaderTool.Utils.DOMUtils.createFromHTML(elementTemplate);

            var createMethod = this._createMethods[type];
            if( createMethod ){
                initialData = ShaderTool.Utils.isArray(initialData) ? initialData : [];

                control = createMethod.apply(this, [name, element, initialData] );
            } else {
                throw new ShaderTool.Exception('Unknown uniform control type: ' + type);
                return null;
            }

            control.name = name;
            control.type = type;
            control.element = element;

            this._controls.push(control);
            this._container.appendChild(element);

            // name element
            var nameElement = element.querySelector('[data-uniform-name]');
            if(nameElement){
                nameElement.setAttribute('title', 'Uniform ' + name + ' settings');
                nameElement.innerHTML = name;

                ShaderTool.Utils.DOMUtils.addEventListener(nameElement, 'dblclick', function( e ){
                    e.preventDefault();
                    alert('Show uniform rename dialog?')
                });
            }

            // delete element
            var deleteElement = element.querySelector('[data-uniform-delete]');
            if(deleteElement){
                ShaderTool.Utils.DOMUtils.addEventListener(deleteElement, 'click', function( e ){
                    e.preventDefault();

                    if (confirm('Delete uniform?')) {
                        self._removeControl( control );
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

                    control.element.parentNode.removeChild( control.element );
                    break;
                }
            }
            if(!skipCallChangeFlag){
                this._callChangeUniformList();
            }
        },
        _clearControls: function(skipCallChangeFlag){

            var c = 0;
            for(var k=0;k<this._controls.length; k++){
                c++;
                if(c > 100){
                    return;
                }

                this._removeControl( this._controls[k], true );
                k--;
            }

            if(!skipCallChangeFlag){
                this._callChangeUniformList();
            }
        },

        _createFloat: function( name, element, initialData ){
            
            var self = this;

            var saveData = [ this._prepareRangeData( initialData[0]) ];

            var uniformValue = saveData[0].value;

            this._initRangeElementGroup(element, '1', saveData[0], function(){
                uniformValue = saveData[0].value;

                self._callChangeUniformValue();
            });

            return {
                code: 'uniform float ' + name + ';',
                data: saveData,

                getUniformValue: function(){
                    return uniformValue;
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

            this._initRangeElementGroup(element, '1', saveData[0], function(){
                uniformValue[0] = saveData[0].value;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '2', saveData[1], function(){
                uniformValue[1] = saveData[1].value;

                self._callChangeUniformValue();
            });

            return {
                code: 'uniform vec2 ' + name + ';',
                data: saveData,

                getUniformValue: function(){
                    return uniformValue;
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

            this._initRangeElementGroup(element, '1', saveData[0], function(){
                uniformValue[0] = saveData[0].value;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '2', saveData[1], function(){
                uniformValue[1] = saveData[1].value;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '3', saveData[2], function(){
                uniformValue[2] = saveData[2].value;

                self._callChangeUniformValue();
            });

            return {
                code: 'uniform vec3 ' + name + ';',
                data: saveData,

                getUniformValue: function(){
                    return uniformValue;
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

            this._initRangeElementGroup(element, '1', saveData[0], function(){
                uniformValue[0] = saveData[0].value;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '2', saveData[1], function(){
                uniformValue[1] = saveData[1].value;   

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '3', saveData[2], function(){
                uniformValue[2] = saveData[2].value;

                self._callChangeUniformValue();
            });
            this._initRangeElementGroup(element, '4', saveData[3], function(){
                uniformValue[3] = saveData[3].value;

                self._callChangeUniformValue();
            });

            return {
                code: 'uniform vec4 ' + name + ';',
                data: saveData,

                getUniformValue: function(){
                    return uniformValue;
                }
            }
        },
        _createColor3: function( name, element, initialData ){
            var self = this;

            var saveData = this._prepareColorData(initialData, false)

            this._initColorSelectElementGroup( element, false, saveData, function(){
                self._callChangeUniformValue();
            })
            
            return {
                code: 'uniform vec3 ' + name + ';',
                data: saveData,
                getUniformValue: function(){
                    return saveData;
                }
            }
        },
        _createColor4: function( name, element, initialData ){
            var self = this;

            var saveData = this._prepareColorData(initialData, true);

            this._initColorSelectElementGroup( element, true, saveData, function(){
                self._callChangeUniformValue();
            })

            return {
                code: 'uniform vec4 ' + name + ';',
                data: saveData,

                getUniformValue: function(){
                    return saveData;
                }
            }
        },

        _prepareColorData: function( inputData, vec4Format ){
            inputData = ShaderTool.Utils.isArray( inputData ) ? inputData : [];
            var resultData = vec4Format ? [0,0,0,1] : [0,0,0];

            var counter = vec4Format ? 4 : 3;

            for(var k=0; k<counter;k++){
                var inputComponent = inputData[k];
                if( typeof inputComponent != 'undefined' ){
                    resultData[k] = inputComponent;
                }
            }

            return resultData;
        },
        _prepareRangeData: function( inputData ){
            inputData = typeof inputData == 'undefined' ? {} : inputData;

            var resultData = { value: 0, min: 0, max: 1 };

            for(var i in resultData){
                if(typeof inputData[i] != 'undefined'){
                    resultData[i] = inputData[i];
                }
            }

            return resultData;
        },
        _componentToHex: function(c){
            var hex = c.toString(16);
            return hex.length == 1 ? '0' + hex : hex;
        },
        _hexFromRGB: function(r, g, b){
            return '#' + this._componentToHex(r) + this._componentToHex(g) + this._componentToHex(b);
        },
        _initColorSelectElementGroup: function( element, useAlpha, initialData, changeHandler ){
            var colorElement = element.querySelector('[data-color]');

            colorElement.value = this._hexFromRGB(initialData[0] * 256 << 0, initialData[1] * 256 << 0, initialData[2] * 256 << 0);

            ShaderTool.Utils.DOMUtils.addEventListener(colorElement, 'change', function( e ){
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorElement.value);

                initialData[0] = parseInt( result[1], 16 ) / 256;
                initialData[1] = parseInt( result[2], 16 ) / 256;
                initialData[2] = parseInt( result[3], 16 ) / 256;

                changeHandler();
            });

            

            if(useAlpha){
                var rangeElement = element.querySelector('[data-range]');

                rangeElement.setAttribute('min', '0');
                rangeElement.setAttribute('max', '1');
                rangeElement.setAttribute('step', '0.001');
                rangeElement.setAttribute('value', initialData[3] );

                ShaderTool.Utils.DOMUtils.addEventListener(rangeElement, 'input', function( e ){
                    initialData[3] = parseFloat(rangeElement.value);

                    changeHandler();
                })
            }
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

            ShaderTool.Utils.DOMUtils.addEventListener(rangeElement, 'input', function( e ){

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

                initialData.min = minValue;
                initialData.max = maxValue;
                initialData.value = parseFloat(rangeElement.value);

                changeHandler( initialData );
            });

            function updateRangeSettings(){
                if(minElement.value == '' || maxElement.value == ''){
                    return;
                }

                prevMinValue = minElement.value;
                prevMaxValue = maxElement.value;

                minValue = ShaderTool.Utils.toDecimalString(minElement.value);
                maxValue = ShaderTool.Utils.toDecimalString(maxElement.value);

                var min = minValue = parseFloat(minValue);
                var max = maxValue = parseFloat(maxValue);

                if(min > max){
                    max = [min, min = max][0];
                }

                rangeElement.setAttribute('min', min);
                rangeElement.setAttribute('max', max);

                initialData.min = min;
                initialData.max = max;
            }

            ShaderTool.Utils.DOMUtils.addEventListener([minElement, maxElement], 'keydown input change', function( e ){
                if(!ShaderTool.Utils.isNumberKey( e )){
                    e.preventDefault();
                    return false;
                }
                updateRangeSettings();
            });

            updateRangeSettings();
        }
    }

    UniformControls.FLOAT   = 'float';
    UniformControls.VEC2    = 'vec2';
    UniformControls.VEC3    = 'vec3';
    UniformControls.VEC4    = 'vec4';
    UniformControls.COLOR3  = 'color3';
    UniformControls.COLOR4  = 'color4';
    UniformControls.TYPES   = [UniformControls.FLOAT, UniformControls.VEC2, UniformControls.VEC3, UniformControls.VEC4, UniformControls.COLOR3, UniformControls.COLOR4];

    return new UniformControls();
})();

// SaveController
ShaderTool.modules.SaveController = (function(){
    var DEFAULT_CODE = '{"uniforms":[{"name":"bgcolor","type":"color3","data":[0.99609375,0.8046875,0.56640625]}],"source":"void main() {\\n    gl_FragColor = vec4(bgcolor, 1.);\\n}"}';

    function SaveController(){}

    SaveController.prototype = {
        init: function(){
            console.log('ShaderTool.modules.SaveController.init');

            var savedData = ShaderTool.helpers.LSHelper.getItem('lastShaderData');
            if(savedData){
                ShaderTool.modules.Rendering.setData(savedData, true);
            } else {
                ShaderTool.modules.Rendering.setData(JSON.parse(DEFAULT_CODE), true);
            }

            this._initSaveDialogs();

            ShaderTool.modules.Rendering.onChange.add( this._saveLocalState, this);

            this._saveLocalState();
        },
        _initSaveDialogs: function(){
            this.dom = {};

            this.dom.setCodeInput = document.getElementById('st-set-code-input');
            this.dom.setCodeSubmit = document.getElementById('st-set-code-submit');
            this.dom.getCodeInput = document.getElementById('st-get-code-input');

            var self = this;
            ShaderTool.Utils.DOMUtils.addEventListener(this.dom.setCodeSubmit, 'click', function( e ){
                var code = self.dom.setCodeInput.value;
                if(code != ''){
                    ShaderTool.modules.Rendering.setData(JSON.parse(code), true)
                }
            })
        },
        _saveLocalState: function(){
            var saveData = ShaderTool.modules.Rendering.getData();
            ShaderTool.helpers.LSHelper.setItem('lastShaderData', saveData);

            this.dom.getCodeInput.value = JSON.stringify(saveData);
        }
    }

    return new SaveController();
})();


ShaderTool.modules.PopupManager = (function(){

    var OPENED_CLASS_NAME = '_opened';

    function PopupManager(){}
    PopupManager.prototype = {
        init: function(){
            console.log('ShaderTool.modules.PopupManager.init');

            this.dom = {};
            this.dom.overlay = document.getElementById('st-popup-overlay');

            this._opened = false;

            var self = this;
            ShaderTool.Utils.DOMUtils.addEventListener(this.dom.overlay, 'mousedown', function( e ){
                if( e.target === self.dom.overlay ){
                    self.close();
                }
            })

            var openers = document.querySelectorAll('[data-popup-opener]');

            ShaderTool.Utils.DOMUtils.addEventListener(openers, 'click', function( e ){
                self.open( this.getAttribute('data-popup-opener') )
            })
        },

        open: function( popupName ){
            this.close();

            var popup = this.dom.overlay.querySelector(popupName);
            if( popup ){
                this._opened = true;

                this._currentPopup = popup;
                ShaderTool.Utils.DOMUtils.addClass(this._currentPopup, OPENED_CLASS_NAME);
                ShaderTool.Utils.DOMUtils.addClass(this.dom.overlay, OPENED_CLASS_NAME);

            } else {
                // TODO;
            }
        },
        close: function(){
            if(!this._opened){
                return;
            }
            this._opened = false;

            ShaderTool.Utils.DOMUtils.removeClass(this.dom.overlay, OPENED_CLASS_NAME);
            ShaderTool.Utils.DOMUtils.removeClass(this._currentPopup, OPENED_CLASS_NAME);
        }
    }

    return new PopupManager();
})();

// classes
ShaderTool.classes.Rasterizer = (function(){
	var VERTEX_SOURCE = 'attribute vec2 av2_vtx;varying vec2 vv2_v;void main(){vv2_v = av2_vtx;gl_Position = vec4(av2_vtx, 0., 1.);}';

	function Rasterizer( context ){
		this._context = context;

		this._program = null;
		this._prevProgram = null;
		this._buffer = this._context.createVertexBuffer().upload(new ShaderTool.Utils.Float32Array([1,-1,1,1,-1,-1,-1,1]));

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


				console.warn('Error updating Rasterizer fragmentSource: ' + e.message);
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
