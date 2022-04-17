NEWSCHEMA('Streams', function(schema) {

	schema.define('id', 'String(30)');
	schema.define('name', String, true);
	schema.define('author', String);
	schema.define('version', String);
	schema.define('icon', String);
	schema.define('reference', String);
	schema.define('group', String);
	schema.define('url', String);
	schema.define('color', 'String(7)');
	schema.define('readme', String);
	schema.define('proxypath', String); // proxy server

	schema.setQuery(function($) {
		var arr = [];
		for (var key in MAIN.flowstream.db) {
			if (key !== 'variables') {
				var item = MAIN.flowstream.db[key];
				var instance = MAIN.flowstream.instances[key];
				arr.push({ id: item.id, name: item.name, group: item.group, author: item.author, reference: item.reference, url: item.url, color: item.color, icon: item.icon, readme: item.readme, dtcreated: item.dtcreated, dtupdated: item.dtupdated, errors: false, size: item.size || 0, version: item.version, proxypath: item.proxypath, stats: instance ? instance.flow.stats : {} });
			}
		}
		$.callback(arr);
	});

	schema.setRead(function($) {
		var id = $.id;
		var item = MAIN.flowstream.db[id];
		if (item) {
			var data = {};
			for (var key of schema.fields)
				data[key] = item[key];
			$.callback(data);
		} else
			$.invalid(404);
	});

	schema.setSave(function($, model) {

		var init = !model.id;

		var db = MAIN.flowstream.db;

		if (model.proxypath) {

			if (model.proxypath[0] !== '/')
				model.proxypath = '/' + model.proxypath;

			if (model.proxypath[model.proxypath.length - 1] !== '/')
				model.proxypath += '/';

			if (model.proxypath === '/cdn/' || model.proxypath === '/fapi/' || model.proxypath === '/private/' || model.proxypath === '/flows/' || model.proxypath === '/designer/') {
				$.invalid('@(Proxy endpoint contains not allowed path)');
				return;
			}

			for (var key in db) {
				if (db[key].proxypath === model.proxypath && key !== model.id) {
					$.invalid('Proxy endpoint is already used by the "{0}" Flow.'.format(db[key].name));
					return;
				}
			}
		}

		if (init) {
			model.id = 'f' + UID();
			model.design = {};
			model.components = {};
			model.variables = {};
			model.sources = {};
			model.dtcreated = NOW;
			MAIN.flowstream.db[model.id] = model;
			MAIN.flowstream.init(model.id, ERROR('FlowStream.init'));
		} else {
			var item = MAIN.flowstream.db[model.id];
			if (item) {
				item.dtupdated = NOW;
				item.name = model.name;
				item.icon = model.icon;
				item.url = model.url;
				item.version = model.version;
				item.reference = model.reference;
				item.author = model.author;
				item.group = model.group;
				item.color = model.color;
				item.readme = model.readme;

				// Remove older proxy
				if (item.proxypath !== model.proxypath && item.proxypath)
					PROXY(item.proxypath, null);

				item.proxypath = model.proxypath;
				var instance = MAIN.flowstream.instances[model.id];
				instance && instance.refresh(model.id, 'meta', CLONE(model));
			} else {
				$.invalid(404);
				return;
			}
		}

		MAIN.flowstream.save();
		$.audit();
		$.success();
	});

	schema.setRemove(function($) {
		var id = $.id;
		var item = MAIN.flowstream.db[id];
		if (item) {

			var path = CONF.directory ? CONF.directory : ('~' + PATH.root('flowstream'));
			if (path[0] === '~')
				path = path.substring(1);
			else
				path = PATH.root(CONF.directory);

			F.Fs.rm(PATH.join(path, id), { recursive: true, force: true }, NOOP);

			item.proxy && PROXY(item.proxy, null);

			delete MAIN.flowstream.db[id];
			MAIN.flowstream.instances[id].destroy();
			MAIN.flowstream.save();
			$.audit();
			$.success();
		} else
			$.invalid(404);
	});

	schema.addWorkflow('raw', function($) {
		var item = MAIN.flowstream.db[$.id];
		if (item)
			$.callback(item);
		else
			$.invalid(404);
	});

	schema.addWorkflow('stats', function($) {

		var data = {};
		data.messages = 0;
		data.pending = 0;
		data.mm = 0;
		data.memory = process.memoryUsage().heapUsed;

		for (var key in MAIN.flowstream.instances) {
			var flow = MAIN.flowstream.instances[key];
			if (flow.flow && flow.flow.stats) {
				data.messages += flow.flow.stats.messages;
				data.mm += flow.flow.stats.mm;
				data.pending += flow.flow.stats.pending;
			}
		}

		$.callback(data);
	});

	schema.addWorkflow('pause', function($) {
		var id = $.id;
		var item = MAIN.flowstream.db[id];
		if (item) {
			var is = $.query.is ? ($.query.is === '1') : null;
			var instance = MAIN.flowstream.instances[id];

			if (instance.flow.stats && is != null)
				instance.flow.stats.paused = is;

			instance.pause(is);
			$.audit();
			$.success();
		} else
			$.invalid(404);

	});

	schema.addWorkflow('restart', function($) {
		var id = $.id;
		var item = MAIN.flowstream.instances[id];
		if (item) {
			if (item.flow) {
				if (item.flow.terminate)
					item.flow.terminate();
				else
					item.flow.kill(9);
			}
			$.success();
		} else
			$.invalid(404);
	});

});
