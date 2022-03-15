exports.install = function() {
	ROUTE('+GET /');
	ROUTE('+GET /designer/');
	ROUTE('-GET /', 'login');
};