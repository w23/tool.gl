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
	this.utils = {};

	var self = this;
	catchReady(function(){
		self.modules.Editor.init();
	})
})();

// Utils
// Modules
ShaderTool.modules.Editor = (function(){

	function Editor(){}

	Editor.prototype = {
		init: function(){
			this.element = document.getElementById('editor');

			this._editor = ace.edit(this.element);
			this._editor.setTheme('ace/theme/solarized_light');
			this._editor.getSession().setMode('ace/mode/glsl');
		}
	}

	return new Editor();
})();
// Elements