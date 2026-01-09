const EXPIRE = '2 minutes';
var Data = {};

if (!CONF.op_cookie)
	CONF.op_cookie = 'op';

// A temporary object for storing of sessions
Data.sessions = {};
Data.permissions = [];

// Meta file
ROUTE('FILE /openplatform.json', function($) {

	var model = {};

	model.name = CONF.op_name || CONF.name;
	model.icon = CONF.op_icon;
	model.color = CONF.op_color;
	model.url = CONF.op_url || $.hostname();
	model.permissions = Data.permissions;

	if (CONF.op_path)
		model.url += CONF.op_path;

	$.json(model);
});

ROUTE('#401', function($) {

	// Auto redirect for the OpenPlatform
	if (!$.user && (CONF.op_reqtoken || CONF.op_restoken)) {
		if (!$.query.login && CONF.openplatform) {
			$.redirect(QUERIFY(CONF.openplatform, { redirect: $.address }));
			return;
		}
	}

	$.invalid(401);

});

// Auth method
Data.auth = function($) {

	if (!CONF.op_reqtoken || !CONF.op_restoken) {
		$.invalid();
		return;
	}

	let q = $.query;
	let a = q.openplatform || (CONF.op_cookie ? $.cookie(CONF.op_cookie) : '');

	if (!a) {
		$.invalid();
		return;
	}

	let m = a.match(/token=.*?(&|$)/);
	if (!m) {
		$.invalid();
		return;
	}

	// token~sign
	let tmp = m[0].substring(6).split('~');
	let token = tmp[0];
	let sign = tmp[1];
	let session = Data.sessions[token];

	if (session) {
		Data.onread && Data.onread(session);
		$.success(session);
		return;
	}

	let checksum = a.replace('~' + sign, '').md5(CONF.op_reqtoken);

	if (checksum !== sign) {
		$.invalid();
		return;
	}

	var opt = {};

	opt.url = a;
	opt.method = 'GET';
	opt.headers = { 'x-token': sign.md5(CONF.op_restoken) };
	opt.keepalive = true;
	opt.callback = function(err, response) {

		if (err || response.status !== 200) {
			$.invalid();
			return;
		}

		session = response.body.parseJSON(true);

		if (session) {

			if (!session.permissions)
				session.permissions = [];

			session.dtexpire = NOW.add(CONF.op_expire || EXPIRE);
			session.token = token;
			session.logout = Logout;
			session.json = Json;
			session.notification = Notification;
			var hostname = opt.url.substring(0, opt.url.indexOf('/', 10));
			session.iframe = session.iframe === false ? null : (hostname + '/iframe.js');
			CONF.openplatform = hostname;
			Data.sessions[token] = session;
			Data.oncreate && Data.oncreate(session);
			$.success(session);
		} else
			$.invalid();
	};

	REQUEST(opt);
};

ON('service', function() {
	for (let key in Data.sessions) {
		let session = Data.sessions[key];
		if (session.dtexpire < NOW) {
			delete Data.sessions[key];
			Data.onremove && Data.onremove(session);
		}
	}
});

function Json() {
	let obj = {};
	for (let key in this) {
		switch (key) {
			case 'token':
			case 'dtexpired':
			case 'openplatformid':
			case 'openplatform':
			case 'notify':
			case 'notification':
			case 'sign':
			case 'json':
			case 'logout':
				break;
			default:
				obj[key] = this[key];
				break;
		}
	}
	obj.openplatform = true;
	return obj;
}

function Notification(body, path, icon, color) {

	let model = {};

	model.body = body;
	model.path = path;
	model.icon = icon;
	model.color = color;

	if (!this.sign)
		this.sign = this.notify.md5(CONF.op_reqtoken).md5(CONF.op_restoken);

	return RESTBuilder.POST(this.notify, model).header('x-token', this.sign).promise();
}

function Logout() {
	var session = Data.sessions[this.token];
	if (session) {
		delete Data.sessions[this.token];
		Data.onremove && Data.onremove(session);
	}
}

LOCALIZE($ => ($.user ? $.user.language : '') || $.query.language || CONF.language || '');
AUTH(Data.auth);
global.OpenPlatform = Data;