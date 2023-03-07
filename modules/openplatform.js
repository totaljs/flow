const EXPIRE = '2 minutes';

var Data = {};

// A temporary object for storing of sessions
Data.sessions = {};
Data.permissions = [];

// Meta file
ROUTE('FILE /openplatform.json', function(req, res) {

	var model = {};

	model.name = CONF.op_name || CONF.name;
	model.icon = CONF.op_icon;
	model.color = CONF.op_color;
	model.url = CONF.op_url || req.hostname();
	model.permissions = Data.permissions;

	if (CONF.op_path)
		model.url += CONF.op_path;

	res.json(model);
});

// Auth method
Data.auth = function($) {

	if (!CONF.op_reqtoken || !CONF.op_restoken) {
		$.invalid();
		return;
	}

	var q = $.query;
	var a = q.openplatform || '';

	if (!a) {
		$.invalid();
		return;
	}

	var m = a.match(/token=.*?(&|$)/);
	if (!m) {
		$.invalid();
		return;
	}

	// token~sign
	var tmp = m[0].substring(6).split('~');
	var token = tmp[0];
	var sign = tmp[1];
	var session = Data.sessions[token];

	if (session) {
		Data.onread && Data.onread(session);
		$.success(session);
		return;
	}

	var checksum = q.openplatform.replace('~' + sign, '').md5(CONF.op_reqtoken);

	if (checksum !== sign) {
		$.invalid();
		return;
	}

	var opt = {};

	opt.url = q.openplatform;
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
			session.iframe = hostname + '/iframe.js';
			Data.sessions[token] = session;
			Data.oncreate && Data.oncreate(session);
			$.success(session);
		} else
			$.invalid();
	};

	REQUEST(opt);
};

ON('service', function() {
	for (var key in Data.sessions) {
		var session = Data.sessions[key];
		if (session.dtexpire < NOW) {
			delete Data.sessions[key];
			Data.onremove && Data.onremove(session);
		}
	}
});

function Json() {
	var obj = {};
	for (var key in this) {
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
	return obj;
}

function Notification(body, path, icon, color) {

	var model = {};

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

DEF.onLocale = req => (req.user ? req.user.language : req.query.language) || CONF.language || '';
AUTH(Data.auth);
global.OpenPlatform = Data;