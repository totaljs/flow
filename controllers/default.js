exports.install = function() {
	ROUTE('+GET /');
	ROUTE('+GET /designer/');
	ROUTE('-GET /', login);
};

function login($) {
	if (CONF.op_reqtoken && CONF.op_restoken)
		$.fallback(401);
	else
		$.view('login');
}