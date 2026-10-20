exports.install = function() {

	// Main WebSocket communication
	ROUTE('+SOCKET   ?/{id}/ <8MB', socket); // max. 8 MB

	// REST API
	ROUTE('+POST     ?/update/ @upload <10MB', update); // Flow updater
	ROUTE('GET       /private/',               private);
	ROUTE('GET       /notify/{id}/',           notify);
	ROUTE('POST      /notify/{id}/ <1MB',      notify); // 1 MB

	// Routes
	ROUTE('+GET /designer/', designer);
	ROUTE('-GET /', login);
	ROUTE('+GET /', index);
	ROUTE('GET  /auth/', auth);
};

function designer($) {
	let model = {};
	model.socket = $.query.socket;
	model.darkmode = $.query.darkmode == '1' || $.query.darkmode == 'true';
	model.permit = { pause: true, config: true, trigger: true, design: true, download: true, tms: true, variables: true, components: true, restart: true };
	model.components = (CONF.components || 'https://cdn.totaljs.com/flowstream/webcomponents/db.json') + (CONF.components2 ? (',' + CONF.components2) : '');
	$.view('designer', model);
}

function login($) {
	if (CONF.op_reqtoken && CONF.op_restoken) {
		if ($.query.login && CONF.openplatform)
			$.redirect(CONF.openplatform);
		else
			$.fallback(401);
	} else if (CONF.sso) {
		if ($.banned || $.query.authorized)
			$.redirect(CONF.sso);
		else
			$.redirect(CONF.sso + '/?url=' + $.hostname());
	} else
		$.view('login');
}

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

function socket($) {
	Flow.socket($.params.id, $);
}

function update($) {

	let file = $.files[0];

	if (!Total.isBundle) {
		$.invalid('@(Available for bundled version only)');
		return;
	}

	if (file && file.ext === 'bundle') {
		file.move(PATH.join(PATH.root(), '../bundles/app.bundle'), function(err) {
			if (err) {
				$.invalid(err);
			} else {
				$.success();
				setTimeout(() => Total.restart(), 1000);
			}
		});
	} else
		$.invalid('Invalid file');
}

function private($) {

	if (!PREF.token) {
		$.invalid(401);
		return;
	}

	if (BLOCKED($, 10, '15 minutes'))
		return;

	if ($.query.token !== PREF.token) {
		$.invalid(401);
		return;
	}

	BLOCKED($, -1);

	let filename = $.query.filename;
	if (filename) {

		filename = filename.replace(/\.{2,}|~|\+|\/|\\/g, '');

		let path = PATH.private(filename);

		Total.Fs.lstat(path, function(err, stat) {

			if (err) {
				$.fallback(404);
				return;
			}

			let offset = $.query.offset;
			let opt = {};

			if (offset) {
				offset = U.parseInt(offset);
				opt.start = offset;
			}

			let stream = Total.Fs.createReadStream(path, opt);
			let headers = $.response.headers;

			headers['cache-control'] = 'private, no-cache, no-store, max-age=0';
			headers['x-size'] = stat.size;
			headers['last-modified'] = stat.mtime.toUTCString();

			$.stream(U.contentTypes[U.getExtension(path)], stream, filename);

		});

		return;
	}

	let q = $.query.q;

	U.ls2(PATH.private(), function(files) {
		let arr = [];
		for (let file of files)
			arr.push({ name: file.filename.substring(file.filename.lastIndexOf('/') + 1), size: file.stats.size, modified: file.stats.mtime });
		$.json(arr);
	}, q);
}

function notify($) {
	Flow.notify($, $.params.id);
}

function auth($) {
	if ($.query.token)
		$.cookie(CONF.op_cookie, $.query.token, '1 month');
	$.redirect('/?authorized=1');
}
