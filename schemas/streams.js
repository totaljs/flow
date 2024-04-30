const Fields = 'id,name:SafeString,author,version,icon:Icon,reference,group,url,cloning:Boolean,color:Color,readme,memory:Number,proxypath'.toJSONSchema();

NEWACTION('Streams/query', {
	name: 'Query streams',
	action: function($) {
		var arr = [];
		for (var key in Flow.db) {
			if (key !== 'variables') {
				var item = Flow.db[key];
				var instance = Flow.instances[key];
				arr.push({ id: item.id, name: item.name, group: item.group, author: item.author, reference: item.reference, url: item.url, color: item.color, icon: item.icon, readme: item.readme, dtcreated: item.dtcreated, dtupdated: item.dtupdated, errors: false, size: item.size || 0, version: item.version, proxypath: item.proxypath ? (CONF.default_root ? (CONF.default_root + item.proxypath.substring(1)) : item.proxypath) : '', memory: item.memory, stats: instance ? instance.flow.stats : {} });
			}
		}
		$.callback(arr);
	}
});

NEWACTION('Streams/read', {
	name: 'Read specific stream',
	params: '*id',
	action: function($) {
		var id = $.params.id;
		var item = Flow.db[id];
		if (item) {
			var data = {};
			for (let key in Fields.properties)
				data[key] = item[key];
			if (data.cloning == null)
				data.cloning = true;
			$.callback(data);
		} else
			$.invalid(404);
	}
});

NEWACTION('Streams/save', {
	name: 'Save specific stream',
	input: Fields,
	action: function($, model) {

		var init = !model.id;

		if (init) {
			if (UNAUTHORIZED($, 'create'))
				return;
		}

		var db = Flow.db;

		if (model.proxypath) {

			if (model.proxypath[0] !== '/')
				model.proxypath = '/' + model.proxypath;

			if (model.proxypath[model.proxypath.length - 1] !== '/')
				model.proxypath += '/';

			var ignore = ['/', '/cdn/', '/fapi/', '/private/', '/flows/', '/designer/', '/parts/', '/forms/', '/css/', '/js/', '/fonts/', '/panels/'];

			if (ignore.includes(model.proxypath)) {
				$.invalid('@(Proxy endpoint contains reserved path)');
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
			model.asfiles = CONF.flowstream_asfiles === true;
			model.worker = CONF.flowstream_worker;
			model.variables2 = Flow.db.variables || {};
			model.directory = CONF.directory || PATH.root('/flowstream/');
			model.env = PREF.env || 'dev';

			if (!model.memory)
				model.memory = CONF.flowstream_memory || 0;

			TRANSFORM('flowstream.create', model, function(err, model) {
				Flow.db[model.id] = model;
				Flow.load(model, ERROR('FlowStream.init'));
			});

		} else {
			var item = Flow.db[model.id];
			if (item) {

				item = CLONE(item);
				item.dtupdated = NOW;
				item.name = model.name;
				item.icon = model.icon;
				item.url = model.url;
				item.version = model.version;
				item.reference = model.reference;
				item.author = model.author;
				item.group = model.group;
				item.color = model.color;
				item.memory = model.memory;
				item.cloning = model.cloning;
				item.readme = model.readme;
				item.proxypath = model.proxypath;

				TRANSFORM('flowstream.update', item, function(err, item) {
					Flow.reload(item);
				});

			} else {
				$.invalid(404);
				return;
			}
		}

		$.audit();
		$.success();

		Flow.emit('save');
	}
});

NEWACTION('Streams/remove', {
	name: 'Remoce specific stream',
	permissions: 'remove',
	params: '*id:String',
	action: function($) {

		var id = $.params.id;
		var item = Flow.db[id];
		if (item) {

			var path = CONF.directory ? CONF.directory : ('~' + PATH.root('flowstream'));
			if (path[0] === '~')
				path = path.substring(1);
			else
				path = PATH.root(CONF.directory);

			F.Fs.rm(PATH.join(path, id), { recursive: true, force: true }, NOOP);
			Flow.remove(id);
			Flow.emit('save');

			$.audit(item.name);
			$.success();
		} else
			$.invalid(404);
	}
});

NEWACTION('Streams/raw', {
	name: 'Read stream raw data',
	params: '*id',
	action: function($) {
		var item = Flow.db[$.params.id];
		if (item)
			$.callback(item);
		else
			$.invalid(404);
	}
});

var internalstats = {};
internalstats.node = F.version_node;
internalstats.total = F.version;
internalstats.version = Flow.version;

NEWACTION('Streams/stats', {
	name: 'Read stats',
	action: function($) {

		internalstats.messages = 0;
		internalstats.pending = 0;
		internalstats.mm = 0;
		internalstats.memory = process.memoryUsage().heapUsed;

		internalstats.online = 0;

		for (let key in Total.connections)
			internalstats.online += Total.connections[key].online;

		for (let key in Flow.instances) {
			let flow = Flow.instances[key];
			if (flow.flow && flow.flow.stats) {
				internalstats.messages += flow.flow.stats.messages;
				internalstats.mm += flow.flow.stats.mm;
				internalstats.pending += flow.flow.stats.pending;
			}
		}

		$.callback(internalstats);
	}
});

NEWACTION('Streams/pause', {
	name: 'Pause a specific stream',
	params: '*id',
	action: function($) {
		var id = $.params.id;
		var item = Flow.db[id];
		if (item) {
			var is = $.query.is ? ($.query.is === '1') : null;
			var instance = Flow.instances[id];
			if (instance) {
				if (instance.flow.stats && is != null)
					instance.flow.stats.paused = is;
				instance.pause(is);
				$.audit();
				$.success();
			} else
				$.invalid('@(Instance is not running)');
		} else
			$.invalid(404);
	}
});

NEWACTION('Streams/restart', {
	name: 'Restart a specific stream',
	params: '*id',
	action: function($) {
		var id = $.params.id;
		if (Flow.restart(id))
			$.success();
		else
			$.invalid(404);
	}
});