exports.install = function() {
	ROUTE('+GET /');
	ROUTE('+GET /designer/');
	ROUTE('-GET /', login);
};

function login() {
	if (CONF.op_reqtoken && CONF.op_restoken)
		this.throw401();
	else
		this.view('login');
}