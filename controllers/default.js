exports.install = function() {
	ROUTE('+GET /');
	ROUTE('+GET /$designer', 'designer');
	
	ROUTE('-GET /login', 'login');
};