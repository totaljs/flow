exports.install = function() {
	ROUTE('+GET /', index);
	ROUTE('+GET /designer/');
	ROUTE('-GET /', login);
};

function index($) {

	if ($.user.openplatform && !$.user.iframe && $.query.openplatform) {
		$.cookie(CONF.op_cookie, $.query.openplatform, NOW.add('12 hours'));
		$.redirect($.url);
		return;
	}

	let plugins = [];
	let hostname = $.hostname();

	if (CONF.url !== hostname)
		CONF.url = hostname;

	for (let key in F.plugins) {
		let item = F.plugins[key];
		if (!item.visible || item.visible($.user)) {
			let obj = {};
			obj.id = item.id;
			obj.position = item.position;
			obj.name = TRANSLATE($.user.language || '', item.name);
			obj.icon = item.icon;
			obj.import = item.import;
			obj.routes = item.routes;
			obj.hidden = item.hidden;
			plugins.push(obj);
		}
	}

	$.view('index', plugins);
}

function login($) {
	if (CONF.op_reqtoken && CONF.op_restoken) {
		if ($.query.login && CONF.openplatform)
			$.redirect(CONF.openplatform);
		else
			$.fallback(401);
	} else
		$.view('login');
}