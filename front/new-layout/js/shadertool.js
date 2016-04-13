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
		console.log(123)
	})
})();

// Utils
// Modules
// Elements