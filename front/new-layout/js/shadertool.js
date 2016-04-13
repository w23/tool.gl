var ShaderTool = new (function ShaderTool(){

	function catchReady(fn) {
		if (document.readyState != 'loading'){
			fn();
		} else if (document.addEventListener) {
			document.addEventListener('DOMContentLoaded', fn);
		} else {
			document.attachEvent('onreadystatechange', function() {
				if (document.readyState != 'loading'){
					fn();
				}	
			});
		}
	}


	this.VERSION = '0.01';

	this.modules = {};
	this.elements = {};
	// this.utils = {};

	var self = this;
	catchReady(function(){
		self.modules.Editor.init();
	})
})();

// Utils
ShaderTool.utils = {
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
        var isThrottled = false,
          savedArgs,
          savedThis;

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
    }
};

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

        call: function(applyArguments) {
            applyArguments = applyArguments || [];
            var totalHandlers = this._handlers.length;
            for (var k = 0; k < totalHandlers; k++) {
                var handler = this._handlers[k];
                handler.apply(null, applyArguments);
            }
        }
    };

    return Callback;
})();

// Modules
ShaderTool.modules.Editor = (function(){

	function Editor(){}

	Editor.prototype = {
		init: function(){
			this.element = document.getElementById('editor');

			this._editor = ace.edit(this.element);
			this._editor.setTheme('ace/theme/solarized_light');
			this._editor.getSession().setMode('ace/mode/glsl');

			this.onChange = new ShaderTool.utils.Callback();

			this._editor.getSession().on('change', this.onChange.callShim );
		}
	}

	return new Editor();
})();
// Elements