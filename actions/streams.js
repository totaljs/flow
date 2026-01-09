const Fields = 'id,name:SafeString,author,version,icon:Icon,reference,group,url,cloning:Boolean,color:Color,readme,memory:Number,proxypath'.toJSONSchema();

function skip(key, value) {
	return key === 'unixsocket' || key === 'env' || key === 'import' || key === 'importscript' || key === 'worker' || key === 'asfiles' ? undefined : value;
}

NEWACTION('Streams', {
	name: 'List of FlowStreams',
	route: '+API ?',
	user: true,
	action: function($) {
		let arr = [];
		for (let key in Flow.db) {
			if (key !== 'variables') {
				let item = Flow.db[key];
				let instance = Flow.instances[key];
				arr.push({ id: item.id, name: item.name, group: item.group, author: item.author, reference: item.reference, url: item.url, color: item.color, icon: item.icon, readme: item.readme, dtcreated: item.dtcreated, dtupdated: item.dtupdated, errors: false, size: item.size || 0, version: item.version, proxypath: item.proxypath ? (CONF.default_root ? (CONF.default_root + item.proxypath.substring(1)) : item.proxypath) : '', memory: item.memory, stats: instance ? instance.flow.stats : {} });
			}
		}
		$.callback(arr);
	}
});

NEWACTION('Streams|read', {
	name: 'Read a specific FlowStream',
	route: '+API ?',
	input: '*id',
	user: true,
	action: function($, model) {
		let id = model.id;
		let item = Flow.db[id];
		if (item) {
			let data = {};
			for (let key in Fields.properties)
				data[key] = item[key];
			if (data.cloning == null)
				data.cloning = true;
			$.callback(data);
		} else
			$.invalid(404);
	}
});

NEWACTION('Streams|save', {
	name: 'Save a specific FlowStream',
	route: '+API ?',
	input: Fields,
	audit: true,
	user: true,
	action: function($, model) {

		let init = !model.id;

		if (init) {
			if (UNAUTHORIZED($, 'create'))
				return;
		}

		let db = Flow.db;

		if (model.proxypath) {

			if (model.proxypath[0] !== '/')
				model.proxypath = '/' + model.proxypath;

			if (model.proxypath[model.proxypath.length - 1] !== '/')
				model.proxypath += '/';

			let ignore = ['/', '/cdn/', '/fapi/', '/private/', '/flows/', '/designer/', '/parts/', '/forms/', '/css/', '/js/', '/fonts/', '/panels/'];

			if (ignore.includes(model.proxypath)) {
				$.invalid('@(Proxy endpoint contains reserved path)');
				return;
			}

			for (let key in db) {
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
			model.variables2 = Flow.db.variables || {};
			model.directory = CONF.directory || PATH.root('/flowstream/');
			model.env = PREF.env || 'dev';
			model.worker = 'fork'; // "worker", "false"
			model.import = 'extensions.js';

			if (!model.memory)
				model.memory = CONF.flowstream_memory || 0;

			TRANSFORM('flowstream.create', model, function(err, model) {
				Flow.db[model.id] = model;
				Flow.load(model, ERROR('FlowStream.init'));
			});

		} else {
			let item = Flow.db[model.id];
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

		$.success();
		Flow.emit('save');
	}
});

NEWACTION('Streams|remove', {
	name: 'Remoce a specific FlowStream',
	route: '+API ?',
	permissions: 'remove',
	input: '*id:String',
	user: true,
	action: function($, model) {

		let id = model.id;
		let item = Flow.db[id];

		if (item) {

			let path = CONF.directory ? CONF.directory : ('~' + PATH.root('flowstream'));
			if (path[0] === '~')
				path = path.substring(1);
			else
				path = PATH.root(CONF.directory);

			Total.Fs.rm(PATH.join(path, id), { recursive: true, force: true }, NOOP);
			Flow.remove(id);
			Flow.emit('save');

			$.audit(item.name);
			$.success();
		} else
			$.invalid(404);
	}
});

NEWACTION('Streams|raw', {
	name: 'Read FlowStream raw data',
	route: '+API ?',
	input: '*id',
	user: true,
	action: function($, model) {
		let item = Flow.db[model.id];
		if (item)
			$.callback(item);
		else
			$.invalid(404);
	}
});

var internalstats = {};
internalstats.node = Total.version_node;
internalstats.total = Total.version;
internalstats.version = Flow.version;
internalstats.app = CONF.version;

NEWACTION('Streams|stats', {
	name: 'Read Flowstream stats',
	route: '+API ?',
	user: true,
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

NEWACTION('Streams|pause', {
	name: 'Pause a specific stream',
	route: '+API ?',
	input: '*id:String,is:boolean',
	user: true,
	audit: true,
	action: function($, model) {
		let id = model.id;
		let item = Flow.db[id];
		if (item) {
			let is = model.is;
			let instance = Flow.instances[id];
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

NEWACTION('Streams|restart', {
	name: 'Restart a specific FlowStream',
	route: '+API ?',
	input: '*id:String',
	user: true,
	audit: true,
	action: function($, model) {
		if (Flow.restart(model.id))
			$.success();
		else
			$.invalid(404);
	}
});

NEWACTION('Streams|export', {
	name: 'Export FlowStream in JSON format',
	route: '+API ?',
	input: '*id:String',
	user: true,
	action: function($, model) {
		let id = model.id;
		let item = Flow.db[id];
		if (item)
			$.success(JSON.stringify(item, skip, '\t'));
		else
			$.invalid(404);
	}
});

NEWACTION('Streams|import', {
	name: 'Import FlowStream in JSON format',
	route: '+API ? <10MB <300s',
	input: '*data:String',
	user: true,
	action: function($, model) {

		let data = model.data.parseJSON(true);

		if (!data) {
			$.invalid('@(Invalid data)');
			return;
		}

		data.id = 'f' + UID();

		delete data.unixsocket;
		delete data.directory;
		delete data.size;
		delete data.variables2;
		delete data.origin;

		data.env = PREF.env || 'dev';
		data.directory = CONF.directory || PATH.root('/flowstream/');
		data.variables2 = Flow.db.variables || {};
		data.worker = CONF.flowstream_worker;
		data.asfiles = CONF.flowstream_asfiles === true;

		if (!data.memory)
			data.memory = CONF.flowstream_memory || 0;

		if (!data.design)
			data.design = {};

		if (!data.components)
			data.components = {};

		if (!data.variables)
			data.variables = {};

		data.dtcreated = NOW;

		if (data.proxypath) {
			let db = Flow.db;
			for (let key in db) {
				if (db[key].proxypath && db[key].proxypath === data.proxypath) {
					data.proxypath = '/' + U.random_string(5).toLowerCase() + '/';
					break;
				}
			}
		}

		delete data.dtupdated;
		Flow.db[data.id] = data;
		Flow.load(data, function(err) {
			$.callback({ success: true, value: data.id, error: err ? err.toString() : null });
			Flow.save();
		});
	}
});