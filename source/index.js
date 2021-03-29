// MIT License
// Copyright Peter Širka <petersirka@gmail.com>, Martin Smola <smola.martin@gmail.com>

const Fs = require('fs');
const Exec = require('child_process').exec;
const MESSAGE_STATUS = { type: 'status' };
const MESSAGE_DEBUG = { type: 'debug' };
const MESSAGE_DESIGNER = { type: 'designer', database: [] };
const MESSAGE_TRIGGER = { type: 'trigger' };
const MESSAGE_TRAFFIC = { type: 'traffic' };
const MESSAGE_STATIC = { type: 'callback' };
const MESSAGE_VARIABLES = { type: 'variables' };
const MESSAGE_TEMPLATES = { type: 'templates' };
const MESSAGE_COMPONENTS = { type: 'components' };
const MESSAGE_PAUSED = { type: 'paused' };
const MESSAGE_ERROR = { type: 'error' };
const MESSAGE_ERRORS = { type: 'errors' };
const MESSAGE_CLEARERRORS = { type: 'clearerrors' };
const MESSAGE_COMPONENTOPTIONS = { type: 'componentoptions' };
const MESSAGE_ONLINE = { type: 'online' };
const MESSAGE_TEMPLATE = { type: 'template' };
const REGPARAM = /\{[a-z0-9,-._]+\}/gi;
const PAUSEDEVENTS = { 'data': 1, '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1, '8': 1, '9': 1, '99': 1 };

var FLOWPATH = '/flow/';
var FILEDESIGNER = 'designer.json';
var FILEVARIABLES = 'variables.txt';
var FILEINMEMORY = 'repository.json';

var COUNTER = 0;
var OPT;
var DDOS = {};
var FN = {};
var FILENAME;
var READY = false;
var MODIFIED = null;
var TYPE;

exports.version = 'v6.2.2';

global.FLOW = { components: {}, instances: {}, inmemory: {}, triggers: {}, alltraffic: { count: 0 }, indexer: 0, loaded: false, url: '', $events: {}, $variables: '', variables: EMPTYOBJECT, outputs: {}, inputs: {} };
global.FLOW.version = +exports.version.replace(/[v.]/g, '');

exports.install = function(options) {

	// options.restrictions = ['127.0.0.1'];
	// options.url = '/$flow/';
	// options.auth = ['petersirka:123456'];
	// or --> adds authorize flag
	// options.auth = true;
	// options.token = 'qR3878SAadada';
	// options.limit = 50;
	// options.sharedfiles = true; // false by default, if true then it will use dep.min.jss/css from public directory /js/dep.min.js and /css/dep.min.css

	OPT = options;
	!OPT && (OPT = {});

	if (OPT.auth instanceof Array) {
		OPT.baa = {};
		OPT.auth.forEach(function(user) {
			var hash = user.hash().toString();
			OPT.baa[hash] = user;
		});
	}

	if (!OPT.crashmode)
		OPT.crashmode = process.argv.findIndex(n => n.indexOf('crashmode') !== -1) !== -1;

	OPT.url = U.path(OPT.url || '/$flow/');
	OPT.socket = OPT.url;

	if (OPT.directory) {
		FLOWPATH = OPT.directory;
		PATH.mkdir(FLOWPATH);
	} else
		FLOWPATH = PATH.root(FLOWPATH);

	var endpath = F.isWindows ? '\\' : '/';

	if (FLOWPATH[FLOWPATH.length - 1] !== endpath)
		FLOWPATH += endpath;

	FILEDESIGNER = FLOWPATH + 'designer.json';
	FILEVARIABLES = FLOWPATH + 'variables.txt';
	FILEINMEMORY = FLOWPATH + 'repository.json';

	if (!OPT.templates)
		OPT.templates = 'https://cdn.totaljs.com/flow/templates/list.json';

	if (!OPT.components)
		OPT.components = 'https://cdn.totaljs.com/flow/list.json';

	if (!OPT.limit)
		OPT.limit = 150;

	if (OPT.dark == null)
		OPT.dark = true;

	if (!OPT.type || OPT.type === 'bundle')
		TYPE = 1;
	else if (OPT.type === 'client')
		TYPE = 2;
	else if (OPT.type === 'server')
		TYPE = 3;

	if (TYPE === 2)
		OPT.socket = OPT.external;

	// Routes
	if (OPT.auth === true || OPT.openplatform) {

		if (TYPE !== 3)
			ROUTE(OPT.url, FN.view_index, ['authorize']);

		if (TYPE !== 2)
			WEBSOCKET(OPT.url, FN.websocket, ['authorize', 'json'], OPT.limit);

	} else {

		if (TYPE !== 3)
			ROUTE(OPT.url, FN.view_index);

		if (TYPE !== 2)
			WEBSOCKET(OPT.url, FN.websocket, ['json'], OPT.limit);
	}

	// Merging && Mapping

	if (TYPE !== 3) {

		var depscss = [OPT.url + 'default.css', '@flow/default.css', '@flow/ui.css'];
		var depsjs = [OPT.url + 'default.js', '@flow/default.js', '@flow/ui.js'];

		if (!OPT.sharedfiles) {
			depscss.splice(1, 0, '@flow/dep.min.css');
			depsjs.splice(1, 0, '@flow/dep.min.js');
			MAP(OPT.url + 'fonts/', '@flow/fonts/');
		}

		MERGE.apply(this, depscss);
		MERGE.apply(this, depsjs);

		MAP(OPT.url + 'img/', '@flow/img/');
		MAP(OPT.url + 'forms/', '@flow/forms/');

		// Localization
		LOCALIZE(OPT.url + 'forms/*.html', ['compress']);

	}

	try {
		Fs.mkdirSync(FLOWPATH);
	} catch(e) {}

	// Binds URL
	FLOW.url = OPT.url;

	// ViewEngine helper
	if (TYPE !== 2)
		DEF.helpers.FLOW = FLOW;

	// Service
	ON('service', FN.service);

	// Repository according to the "index" of cluster instance
	if (F.isCluster)
		FILEINMEMORY = FILEINMEMORY.replace('.json', F.id + '.json');

	// Load flow's data
	if (TYPE !== 2) {
		setTimeout(function() {
			FLOW.load();
			setInterval(function() {

				FLOW.indexer++;

				if (FLOW.ws) {
					MESSAGE_TRAFFIC.body = FLOW.alltraffic;

					if (FLOW.indexer % 2 === 0)
						MESSAGE_TRAFFIC.memory = process.memoryUsage().heapUsed.filesize();

					MESSAGE_TRAFFIC.counter = COUNTER;
					FLOW.ws.send(MESSAGE_TRAFFIC);

					var keys = Object.keys(FLOW.alltraffic);
					for (var i = 0, length = keys.length; i < length; i++) {
						var item = FLOW.alltraffic[keys[i]];
						if (item.ni)
							item.input -= item.ni;
						if (item.no)
							item.output -= item.no;
						item.ni = 0;
						item.no = 0;
						item.no0 && (item.no0 = 0);
						item.no1 && (item.no1 = 0);
						item.no2 && (item.no2 = 0);
						item.no3 && (item.no3 = 0);
						item.no4 && (item.no4 = 0);
						item.no5 && (item.no5 = 0);
						item.no6 && (item.no6 = 0);
						item.no7 && (item.no7 = 0);
						item.no8 && (item.no8 = 0);
						item.no9 && (item.no9 = 0);
					}
				}

				if (FLOW.indexer % 10 === 0) {
					FLOW.trafficreset();
					FLOW.indexer = 0;
				}

				OPT.debug && FLOW.indexer % 2 === 0 && FN.listingmodification();

			}, 2000);
		}, 2000);

		if (OPT.debug)
			MODIFIED = {};
	}

	switch (TYPE) {
		case 2:
			delete FN.websocket;
			delete FN.listingmodification;
			delete global.FLOW;
			break;
		case 3:
			delete FN.view_index;
			break;
	}
};

FN.listingmodification = function() {
	U.ls2(FLOWPATH, function(files) {
		for (var i = 0, length = files.length; i < length; i++) {
			var file = files[i];
			var id = file.filename.substring(file.filename.lastIndexOf('/') + 1);
			var time = file.stats.mtime.getTime();
			if (MODIFIED[id]) {
				if (MODIFIED[id] !== time) {
					MODIFIED[id] = time;
					FLOW.execute(file.filename);
					FLOW.debug('The component has been modified: <b>' + id + '</b>');
				}
			} else
				MODIFIED[id] = time;
		}
	}, n => (/\.js$/).test(n));
};

FN.service = function(counter) {

	if (counter % 5 === 0)
		DDOS = {};

	if (TYPE !== 2) {
		FLOW.trafficreset();
		FLOW.emit2('service', counter);

		if (COUNTER > 999999000000)
			COUNTER = 0;
	}
};

FN.view_index = function() {

	if (DDOS[this.ip] > 6) {
		this.throw401();
		return;
	}

	if (OPT.auth instanceof Array) {
		var user = this.baa();
		if (OPT.auth.indexOf(user.user + ':' + user.password) === -1) {
			if (DDOS[this.ip])
				DDOS[this.ip]++;
			else
				DDOS[this.ip] = 1;

			if (DDOS[this.ip] > 4)
				this.throw401();
			else
				this.baa('Secured area, please sign-in');
			return;
		}
		this.repository.baa = (user.user + ':' + user.password).hash();
	}

	if (OPT.restrictions && OPT.restrictions[this.ip] === -1)
		return this.throw401();

	if (OPT.token && OPT.token.indexOf(this.query.token) === -1) {

		if (DDOS[this.ip])
			DDOS[this.ip]++;
		else
			DDOS[this.ip] = 1;

		this.throw401();
		return;
	}

	this.theme('');
	var R = this.repository;
	R.url = OPT.url;
	R.dark = OPT.dark;
	R.version = +exports.version.replace(/\.|v/g, '');
	R.versiontitle = exports.version;
	R.sharedfiles = OPT.sharedfiles;
	R.limit = OPT.limit;
	R.socket = OPT.socket;
	R.openplatform = OPT.openplatform;
	this.view('@flow/index');
};

FN.websocket = function() {
	var self = this;

	self.autodestroy(function() {
		FLOW.ws = null;
	});

	self.on('open', function(client) {

		// Security
		if ((OPT.token && OPT.token.indexOf(client.query.token) === -1) || (OPT.baa && !OPT.baa[client.query.baa]) || (OPT.restrictions && OPT.restrictions[self.ip] === -1)) {
			setImmediate(() => client.close('Unauthorized'));
			return;
		}

		if (client.query.designer === '1' && READY) {
			MESSAGE_DESIGNER.crashmode = OPT.crashmode;
			MESSAGE_DESIGNER.components = FLOW.clearInstances(true);
			client.send(MESSAGE_DESIGNER);
			FLOW.emit('designer', client);
			EMIT('flow.client', client);
		}

		OPT.logging && FLOW.log('connect', null, client);
		MESSAGE_ONLINE.count = self.online;
		self.send(MESSAGE_ONLINE);
	});

	self.on('close', function(client) {
		OPT.logging && FLOW.log('disconnect', null, client);
		MESSAGE_ONLINE.count = self.online;
		self.send(MESSAGE_ONLINE);
	});

	self.on('message', function(client, message) {

		var component;

		if (message.type === 'readme') {
			component = FLOW.components[message.target];
			MESSAGE_STATIC.id = message.id;
			MESSAGE_STATIC.body = component ? TRANSLATOR(client.req.$language || 'default', component.readme) : '';
			client.send(MESSAGE_STATIC);
			return;
		}

		if (message.type === 'templates') {

			var arr = [];
			var templ = [];

			OPT.templates2 && arr.push(OPT.templates2);
			OPT.templates && arr.push(OPT.templates);

			arr.wait(function(item, next) {
				RESTBuilder.GET(item).callback(function(err, response) {
					if (!err) {
						if (response instanceof Array) {
							for (var i = 0; i < response.length; i++)
								templ.push(response[i]);
						}
					}
					next();
				});
			}, function() {

				var templates = [];

				for (var a = 0; a < templ.length; a++) {
					var template = templ[a];
					var obj = templates.findItem('name', template.name);
					if (obj == null) {
						templates.push(template);
						continue;
					}

					// Merge
					for (var j = 0; j < template.items.length; j++) {
						var url = template.items[j];
						if (obj.items.indexOf(url) === -1)
							obj.items.push(url);
					}
				}

				MESSAGE_TEMPLATES.body = templates;
				MESSAGE_TEMPLATES.body && client.send(MESSAGE_TEMPLATES);
			});

			return;
		}

		if (message.type === 'template')
			download_template(message.body, client);

		if (message.type === 'database')
			self.send(MESSAGE_DESIGNER);

		if (message.type === 'components') {

			var arr = [];
			var templ = [];

			OPT.components2 && arr.push(OPT.components2);
			OPT.components && arr.push(OPT.components);

			arr.wait(function(item, next) {
				RESTBuilder.GET(item).callback(function(err, response) {
					if (!err) {
						if (response instanceof Array) {
							for (var i = 0; i < response.length; i++)
								templ.push(response[i]);
						}
					}
					next();
				});
			}, function() {

				var templates = [];

				for (var a = 0; a < templ.length; a++) {
					var template = templ[a];
					var obj = templates.findItem('name', template.name);
					if (obj == null) {
						templates.push(template);
						continue;
					}

					// Merge
					for (var j = 0; j < template.items.length; j++) {
						var url = template.items[j];
						if (obj.items.indexOf(url) === -1)
							obj.items.push(url);
					}
				}

				MESSAGE_COMPONENTS.body = templates;
				MESSAGE_COMPONENTS.body && client.send(MESSAGE_COMPONENTS);
			});

			return;
		}

		if (message.type === 'html') {
			component = FLOW.components[message.target];
			MESSAGE_STATIC.id = message.id;
			MESSAGE_STATIC.body = F.is4 ? U.minify_html(component ? TRANSLATOR(client.req.$language || 'default', component.html) : '') : U.minifyHTML(component ? TRANSLATOR(client.req.$language || 'default', component.html) : '');
			client.send(MESSAGE_STATIC);
			return;
		} else if (message.type === 'clearerrors') {
			OPT.logging && FLOW.log('clearerrors', null, client);
			FLOW.clearerrors();
			return;
		} else if (message.type === 'install') {
			OPT.logging && FLOW.log('install', message.filename, client);
			FLOW.install(message.filename, message.body);
			return;
		} else if (message.type === 'uninstall') {
			OPT.logging && FLOW.log('uninstall', message.target, client);
			FLOW.uninstall(message.target);
			return;
		} else if (message.type === 'getvariables') {
			MESSAGE_VARIABLES.body = FLOW.$variables;
			client.send(MESSAGE_VARIABLES);
			return;
		} else if (message.type === 'variables') {
			OPT.logging && FLOW.log('variables', null, client);
			FLOW.refresh_variables(message.body, client);
			return;
		} else if (message.type === 'pause') {
			MESSAGE_PAUSED.is = MESSAGE_DESIGNER.paused = !MESSAGE_DESIGNER.paused;
			client.send(MESSAGE_PAUSED);
			FLOW.emit('pause', MESSAGE_PAUSED.is);
			FLOW.emit2('pause', MESSAGE_PAUSED.is);
			FLOW.save3();
			EMIT('flow.pause', MESSAGE_PAUSED.is);
			OPT.logging && FLOW.log('pause', MESSAGE_PAUSED.is ? 'paused' : 'running', client);
		} else if (message.target) {

			var instance = FLOW.instances[message.target];
			if (!instance)
				return;

			if (message.type === 'io') {

				var index = +message.index;
				var io = instance.disabledio[message.io];

				if (message.enable) {
					var index = io.indexOf(index);
					if (index > -1)
						instance.disabledio[message.io].splice(index, 1);
				} else {
					if (io.indexOf(index) < 0)
						io.push(index);
				}

				var item = FLOW.instances[message.target];
				item.disabledio = instance.disabledio;
				FLOW.save3();
			}

			if (message.type === 'settings') {
				client.send({ type: 'settings', id: message.target, body: instance.options, copyid: message.copyid });
			} else if (message.type === 'options') {
				instance.reoptions(message.body, client);
			} else {
				OPT.logging && FLOW.log(message.event, instance, client);
				instance.$events[message.event] && instance.emit(message.event, message.body);
			}

			return;
		}

		if (message.type === 'trigger') {
			var trigger = FLOW.triggers[message.name];
			if (trigger) {
				OPT.logging && FLOW.log('trigger', message.name);
				trigger(function(data) {
					MESSAGE_TRIGGER.body = data;
					MESSAGE_TRIGGER.id = message.id;
					self && self.send(MESSAGE_TRIGGER);
				}, message.body);
			} else {
				MESSAGE_TRIGGER.id = message.id;
				MESSAGE_TRIGGER.body = undefined;
				self.send(MESSAGE_TRIGGER);
			}
		}

		if (message.type === 'apply') {
			FLOW.changes(message.body);
			OPT.logging && FLOW.log('apply', null, client);
		}

		if (message.type === 'export')
			client.send({ type: message.type, options: FLOW.getOptions() });

	});

	FLOW.ws = self;
};

function io_count(o) {
	return o instanceof Array ? o.length : (o || 0);
}

// ===================================================
// COMPONENT INSTANCE DECLARATION
// ===================================================

function Component(options) {

	if (options instanceof Component) {
		delete options.status;
		delete options.debug;
		delete options.click;
		delete options.emit;
		delete options.on;
		delete options.signal;
		delete options.send;
	}

	var t = this;

	U.extend(t, options);
	t.duration = 0;
	t.countinput = 0;
	t.countoutput = 0;
	t.state = { text: '', color: 'gray' };
	t.$events = {};
	t.$pending = 0;

	t.$send = function(index, message) {
		t.send(index, message);
	};
}

Component.prototype = {
	get paused() {
		return MESSAGE_DESIGNER.paused;
	}
};

Component.prototype.beg = function() {
	var self = this;
	self.$pending++;
	FLOW.traffic(self.id, 'pending', self.$pending);
	return self;
};

Component.prototype.end = function() {
	var self = this;
	self.$pending--;
	self.$pending < 0 && (self.$pending = 0);
	FLOW.traffic(self.id, 'pending', self.$pending);
	return self;
};

Component.prototype.emit = function(name, a, b, c, d, e, f, g) {

	if (MESSAGE_DESIGNER.paused && PAUSEDEVENTS[name])
		return this;

	var evt = this.$events[name];
	if (evt) {
		var clean = false;
		for (var i = 0, length = evt.length; i < length; i++) {
			if (evt[i].$once)
				clean = true;
			evt[i].call(this, a, b, c, d, e, f, g);
		}
		if (clean) {
			evt = evt.remove(n => n.$once);
			if (evt.length)
				this.$events[name] = evt;
			else
				this.$events[name] = undefined;
		}
	}
	return this;
};

Component.prototype.on = function(name, fn) {
	if (this.$events[name])
		this.$events[name].push(fn);
	else
		this.$events[name] = [fn];
	return this;
};

Component.prototype.once = function(name, fn) {
	fn.$once = true;
	return this.on(name, fn);
};

Component.prototype.removeListener = function(name, fn) {
	var evt = this.$events[name];
	if (evt) {
		evt = evt.remove(n => n === fn);
		if (evt.length)
			this.$events[name] = evt;
		else
			this.$events[name] = undefined;
	}
	return this;
};

Component.prototype.removeAllListeners = function(name) {
	if (name === true)
		this.$events = EMPTYOBJECT;
	else if (name)
		this.$events[name] = undefined;
	else
		this.$events = {};
	return this;
};

Component.prototype.set = function(key, value) {
	FLOW.set('$' + this.id + key, value);
	return this;
};

Component.prototype.get = function(key) {
	return FLOW.get('$' + this.id + key);
};

Component.prototype.rem = function(key) {
	FLOW.rem('$' + this.id + key);
	return this;
};

Component.prototype.log = function() {
	[].splice.call(arguments, 0, 0, this.component);
	LOGGER.apply(LOGGER, arguments);
	return this;
};

Component.prototype.make = function(data, index) {
	return new FlowData(data, false, index == null ? 0 : +index);
};

Component.prototype.click = function() {
	try {
		!OPT.crashmode && this.$events.click && this.emit('click');
	} catch (e) {
		this.error(e);
	}
	return this;
};

Component.prototype.hasConnection = function(index) {
	return this.connections[index] ? this.connections[index].length : 0;
};

Component.prototype.signal = function(index, data) {

	if (data === undefined) {
		data = index;
		index = undefined;
	}

	var self = this;
	var connections = self.connections;

	if (!connections || OPT.crashmode)
		return self;

	var arr = self.$connections;

	if (!arr.length)
		return self;

	for (var i = 0, length = arr.length; i < length; i++) {
		var dex = arr[i];

		if (index !== undefined && dex != index && dex != '99')
			continue;

		var ids = connections[dex];
		for (var j = 0, jl = ids.length; j < jl; j++) {
			var instance = FLOW.instances[ids[j].id];
			instance && !instance.$closed && instance.emit('signal', data, self);
		}
	}

	return self;
};

Component.prototype.inputs = function() {

	var self = this;
	var obj = FLOW.inputs[self.id];
	var arr = [];

	if (obj == null)
		return arr;

	var keys = Object.keys(obj);

	for (var i = 0, length = keys.length; i < length; i++) {
		var id = keys[i];
		var com = FLOW.instances[id];
		com && arr.push(com);
	}

	return arr;
};

Component.prototype.outputs = function() {
	var self = this;
	var obj = FLOW.outputs[self.id];
	var arr = [];

	if (obj == null)
		return arr;

	var keys = Object.keys(obj);

	for (var i = 0, length = keys.length; i < length; i++) {
		var id = keys[i];
		var com = FLOW.instances[id];
		com && arr.push(com);
	}

	return arr;
};

Component.prototype.isDisabled = function(io, index) {
	var self = this;
	var disabledio = self.disabledio;

	if (!io)
		return disabledio;

	if (index === undefined)
		return disabledio[io];

	if (disabledio[io] && disabledio[io].indexOf(index) > -1)
		return true;

	return false;
};

Component.prototype.prev = function(name) {
	var self = this;
	var keys = Object.keys(FLOW.inputs[self.id]);

	for (var i = 0, length = keys.length; i < length; i++) {
		var id = keys[i];
		var com = FLOW.instances[id];

		if (com) {
			if (name) {
				if (com.component === name) {
					return com;
				} else {
					var sub = com.prev(name);
					if (sub)
						return sub;
				}
			} else
				return com;
		}
	}
};

Component.prototype.next = function(name) {
	var self = this;
	var keys = Object.keys(FLOW.outputs[self.id]);

	for (var i = 0, length = keys.length; i < length; i++) {
		var id = keys[i];
		var com = FLOW.instances[id];

		if (com) {
			if (name) {
				if (com.component === name) {
					return com;
				} else {
					var sub = com.next(name);
					if (sub)
						return sub;
				}
			} else
				return com;
		}
	}
};

Component.prototype.variable = function(name) {
	return FLOW.variables[name];
};

Component.prototype.send2 = function(index, message) {
	if (this.hasConnections)
		return this.send(index, message);
};

Component.prototype.callback = function(index, data, callback, param) {

	var isfn = typeof(data) === 'function';

	if (typeof(index) === 'function') {
		callback = index;
		index = 0;
	}

	if (data === undefined || (callback === undefined && !isfn))
		return;

	if (!(data instanceof FlowData) && isfn) {
		param = callback;
		callback = data;
		data = null;
	}

	var self = this;
	var connections = self.connections;
	var conn = connections[index];
	if (!conn || !conn[0])
		return;

	if (self.options && self.options.debug)
		self.debug(data);

	if (self.disabledio.output.indexOf(index) > -1)
		return;

	FLOW.traffic(self.id, 'output', null, index);

	conn = conn[0];
	var instance = FLOW.instances[conn.id];

	if (!instance)
		return;

	var skip = instance.disabledio.input.indexOf(+conn.index) > -1;
	FLOW.traffic(instance.id, 'input', !skip);

	if (skip)
		return;

	instance.$events.data && instance.emit('data', data, callback, param);
	instance.$events[conn.index] && instance.emit(conn.index, data, callback, param);
	return self;
};

Component.prototype.send = function(index, message) {

	if (message === undefined) {
		message = index;
		index = undefined;
	}

	if (!(message instanceof FlowData))
		message = new FlowData(message);

	var self = this;
	var connections = self.connections;

	message.parent = self;

	if (self.options && self.options.debug)
		self.debug(message);

	if (!connections || OPT.crashmode || MESSAGE_DESIGNER.paused) {
		message.completed = true;
		return message;
	}

	var arr = self.$connections;
	if (!arr.length) {
		message.completed = true;
		return message;
	}

	var instance;
	var now = index !== 99 ? Date.now() : null;

	if (index !== 99 && self.$duration) {
		self.duration = self.$last ? now - self.$last : 0;
		self.duration && FLOW.traffic(self.id, 'duration', self.duration);
		self.$duration = 0;
	}

	self.countoutput++;

	if (FLOW.alltraffic[self.id])
		FLOW.alltraffic[self.id].co = self.countoutput;

	if (index === undefined) {

		if (self.$closed)
			return;

		if (self.disabledio.output.indexOf(0) > -1)
			return;

		FLOW.traffic(self.id, 'output', null, 0);

		var tmp = {};

		for (var i = 0, length = arr.length; i < length; i++) {

			if (arr[i] == '99')
				continue;

			var ids = connections[arr[i]] || EMPTYARRAY;
			var canclone = true;

			for (var j = 0, jl = ids.length; j < jl; j++) {
				instance = FLOW.instances[ids[j].id];

				if (!instance)
					continue;

				if (instance && !instance.$closed) {

					var skip = instance.disabledio.input.indexOf(+ids[j].index) > -1;

					if (!tmp[instance.id]) {
						tmp[instance.id] = true;
						FLOW.traffic(instance.id, 'input', !skip);
					}

					if (skip)
						continue;

					try {
						var data = canclone && (instance.cloning || instance.cloning === undefined) ? message.clone() : message;
						data.index = +ids[j].index;

						if (index !== 99 && !instance.$duration) {
							instance.$last = now;
							instance.$duration = 1;
						}

						instance.countinput++;

						if (FLOW.alltraffic[instance.id])
							FLOW.alltraffic[instance.id].ci = instance.countinput;

						instance.$events.data && instance.emit('data', data, instance.$send);
						instance.$events[ids[j].index] && instance.emit(ids[j].index, data, instance.$send);

					} catch (e) {
						instance.error(e, self.id);
					}

				}
			}
		}

	} else {

		arr = connections[index.toString()] || EMPTYARRAY;

		if (!arr || !arr.length) {
			message.completed = true;
			return message;
		}

		var canclone = arr.length > 1;
		if (self.$closed)
			return;

		if (self.disabledio.output.indexOf(index) > -1)
			return;

		FLOW.traffic(self.id, 'output', null, index);

		var tmp = {};
		for (var i = 0, length = arr.length; i < length; i++) {
			instance = FLOW.instances[arr[i].id];

			if (!instance)
				continue;

			var skip = instance.disabledio.input.indexOf(+arr[i].index) > -1;

			if (!tmp[instance.id]) {
				tmp[instance.id] = true;
				FLOW.traffic(instance.id, 'input', skip);
			}

			if (skip)
				continue;

			if (instance && !instance.$closed) {
				try {
					var data = canclone && (instance.cloning || instance.cloning === undefined) ? message.clone() : message;
					data.index = +arr[i].index;

					if (index !== 99 && !instance.$duration) {
						instance.$last = now;
						instance.$duration = 1;
					}

					instance.countinput++;

					if (FLOW.alltraffic[instance.id])
						FLOW.alltraffic[instance.id].ci = instance.countinput;

					instance.$events.data && instance.emit('data', data, instance.$send);
					instance.$events[arr[i].index] && instance.emit(arr[i].index, data, instance.$send);
				} catch (e) {
					instance.error(e, self.id);
				}
			}
		}
	}

	return message;
};

Component.prototype.error = function(e, parent) {
	var self = this;
	var key = (parent instanceof FlowData ? parent.parent.id : parent instanceof Component ? parent.id : parent) || 'error';
	!self.errors && (self.errors = {});
	!self.errors[key] && (self.errors[key] = { count: 0 });
	self.errors[key].error = e.toString() + (e.stack ? ' - ' + e.stack.toString() : '');
	self.errors[key].count++;
	self.errors[key].date = F.datetime;
	MESSAGE_ERRORS.id = self.id;
	MESSAGE_ERRORS.body = self.errors;
	setTimeout2('flow.' + self.id, function() {
		var tmp = FLOW.instances[self.id];
		if (tmp)
			tmp.errors = self.errors;
		FLOW.send(MESSAGE_ERRORS);
	}, 100);
	self.throw(e);
	FLOW.$events.error && FLOW.emit('error', e, self, parent);
	EMIT('flow.error', e, self, parent);
	return self;
};

Component.prototype.status = function(text, color) {

	var comparetext = text || '';
	var comparecolor = color || 'gray';

	if (this.state.text === comparetext && this.state.color === comparecolor)
		return this;

	this.state.text = comparetext;
	this.state.color = comparecolor;
	MESSAGE_STATUS.target = this.id;
	MESSAGE_STATUS.body = this.state;

	var com = FLOW.instances[this.id];
	if (com) {
		com.state = this.state;
		FLOW.send(MESSAGE_STATUS);
	}

	return this;
};

const ERR_MESSAGE = {};

Component.prototype.debug = function(data, style, group, id) {

	MESSAGE_DEBUG.group = group;

	if (data instanceof FlowData) {
		if (data.data instanceof Error) {
			ERR_MESSAGE.error = data.data.message;
			ERR_MESSAGE.stack = data.data.stack;
			MESSAGE_DEBUG.body = ERR_MESSAGE;
		} else if (data.data instanceof Buffer)
			MESSAGE_DEBUG.body = print_buffer(data.data);
		else
			MESSAGE_DEBUG.body = data.data;
	} else
		MESSAGE_DEBUG.body = data instanceof Buffer ? print_buffer(data) : data instanceof Error ? data.toString() : data;

	MESSAGE_DEBUG.identificator = data instanceof FlowData ? data.id : id;
	MESSAGE_DEBUG.time = data instanceof FlowData ? ((new Date() - data.begin) / 1000).floor(2) : null;
	MESSAGE_DEBUG.style = style || 'info';
	MESSAGE_DEBUG.id = this.id;
	FLOW.send(MESSAGE_DEBUG);
	return this;
};

Component.prototype.save = function() {

	var tmp = FLOW.instances[this.id];
	if (tmp) {
		tmp.options = this.options;
		FLOW.save3();
	}

	return this;
};

Component.prototype.reconfig = function() {

	MESSAGE_COMPONENTOPTIONS.id = this.id;
	MESSAGE_COMPONENTOPTIONS.options = this.options;
	MESSAGE_COMPONENTOPTIONS.notes = this.notes;
	MESSAGE_COMPONENTOPTIONS.color = this.color;
	MESSAGE_COMPONENTOPTIONS.name = this.name;

	var db = FLOW.instances[this.id];
	if (db) {
		db.options = this.options;
		db.notes = this.notes;
		db.color = this.color;
		db.name = this.name;
	}

	FLOW.send(MESSAGE_COMPONENTOPTIONS);
	setTimeout2('flow.reconfig', FLOW.save2, 5000);
	return this;
};

FLOW.arg = Component.prototype.arg = function(str) {
	if (typeof(str) === 'object' && str) {
		var keys = Object.keys(str);
		var output = {};
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var val = str[key];
			if (typeof(val) === 'string')
				output[key] = this.arg(val);
			else
				output[key] = val;
		}
		return output;
	} else {
		return typeof(str) === 'string' ? str.replace(REGPARAM, function(text) {
			var val = FLOW.variables[text.substring(1, text.length - 1).trim()];
			return val == null ? text : val;
		}) : str;
	}
};

Component.prototype.flowboard = function(){
	console.log('Flowboard is not initialized yet!');
};

Component.prototype.dashboard = function(){
	console.log('Dashboard is not initialized yet!');
};

Component.prototype.throw = function(data) {
	return this.send(99, data);
};

Component.prototype.$refresh = function() {
	var self = this;
	self.$connections = Object.keys(self.connections || {});
	self.hasConnections = self.$connections.length > 0;
};

Component.prototype.reoptions = function(newoptions, client) {

	// @client {WebSocketClient} is optional

	var instance = this;

	var old_options = instance.options;
	instance.options = newoptions;

	var options = instance.options;

	if (options.NAME !== undefined)
		instance.name = options.NAME || '';

	if (options.REFERENCE != undefined)
		instance.reference = options.REFERENCE;

	if (options.COLOR !== undefined)
		instance.color = options.COLOR;

	if (options.NOTES !== undefined)
		instance.notes = options.NOTES;

	if (!options.debug)
		delete options.debug;

	options.NAME = undefined;
	options.REFERENCE = undefined;
	options.COLOR = undefined;
	options.NOTES = undefined;

	var count;
	var tmpcount;
	var refreshconn = false;

	if (options.OUTPUT != null) {
		count = instance.output instanceof Array ? instance.output.length : instance.output;
		tmpcount = io_count(options.OUTPUT);
		tmpcount !== count && Object.keys(instance.connections).forEach(function(key) {
			var index = +key;
			if (index >= tmpcount) {
				delete instance.connections[key];
				refreshconn = true;
			}
		});
		instance.output = options.OUTPUT;
	}

	if (options.INPUT != null) {
		count = instance.input instanceof Array ? instance.input.length : instance.input;
		tmpcount = io_count(options.INPUT);
		if (tmpcount !== count) {
			Object.keys(FLOW.instances).forEach(function(id) {

				if (id === instance.id)
					return;

				var item = FLOW.instances[id];
				var can = false;

				Object.keys(item.connections).forEach(function(key) {
					var l = item.connections[key].length;
					item.connections[key] = item.connections[key].remove(function(item) {
						return item.id === instance.id && (+item.index) >= tmpcount;
					});
					if (l !== item.connections[key].length)
						can = true;
					!item.connections[key].length && (delete instance.connections[key]);
				});

				if (can) {
					var tmp = FLOW.instances[item.id];
					tmp.connections = item.connections;
					refreshconn = true;
				}
			});
		}
		instance.input = options.INPUT;
	}

	options.OUTPUT = undefined;
	options.INPUT = undefined;

	instance.$refresh();
	instance.$events.options && instance.emit('options', instance.options, old_options);
	EMIT('flow.options', instance);

	refreshconn && FLOW.refresh_connections();
	OPT.logging && FLOW.log('options', instance, client);
	FLOW.save2();
	FLOW.emit2('design');
	return instance;
};

function print_buffer(buf) {
	var response = '<Buffer';
	var arr = buf.toString('hex').split('');
	for (var i = 0, length = arr.length; i < length; i++)
		response += (i % 2 === 0 ? ' ' : '') + arr[i];
	return response + '>';
}

function clone(val) {
	if (val instanceof Buffer) {
		var copy = U.createBufferSize(val.length);
		val.copy(copy);
		return copy;
	}
	return U.clone(val, null, true);
}

// ===================================================
// FLOW METHODS
// ===================================================

FLOW.on = function(name, fn) {
	if (FLOW.$events[name])
		FLOW.$events[name].push(fn);
	else
		FLOW.$events[name] = [fn];
	return this;
};

FLOW.emit = function(name, a, b, c, d, e, f, g) {

	if (OPT.crashmode || (MESSAGE_DESIGNER.paused && name !== 'pause'))
		return FLOW;

	var evt = FLOW.$events[name];
	if (evt) {
		var clean = false;
		for (var i = 0, length = evt.length; i < length; i++) {
			if (evt[i].$once)
				clean = true;
			evt[i].call(F, a, b, c, d, e, f, g);
		}
		if (clean) {
			evt = evt.remove(n => n.$once);
			if (evt.length)
				FLOW.$events[name] = evt;
			else
				FLOW.$events[name] = undefined;
		}
	}
	return FLOW;
};

FLOW.once = function(name, fn) {
	fn.$once = true;
	return FLOW.on(name, fn);
};

FLOW.removeListener = function(name, fn) {
	var evt = FLOW.$events[name];
	if (evt) {
		evt = evt.remove(n => n === fn);
		if (evt.length)
			FLOW.$events[name] = evt;
		else
			FLOW.$events[name] = undefined;
	}
	return FLOW;
};

FLOW.removeAllListeners = function(name) {
	if (name)
		FLOW.$events[name] = undefined;
	else
		FLOW.$events = {};
	return FLOW;
};

FLOW.register = function(name, options, fn) {

	if (typeof(options) === 'function') {
		fn = options;
		options = EMPTYOBJECT;
	}

	var id = name.slug().replace(/-/g, '');
	var obj = FLOW.components[name] = U.clone(options); // because of additional custom fields
	obj.id = id;
	obj.component = name;

	if (!options.name)
		options.name = options.title;

	obj.name = options.name || name;
	obj.title = options.title;
	obj.author = options.author || 'Unknown';
	obj.color = options.color;
	obj.icon = (options.icon ? options.icon.substring(0, 3) === 'fa-' ? options.icon.substring(0, 2) : options.icon : options.icon) || '';
	obj.input = options.input == null ? 0 : options.input;
	obj.output = options.output == null ? 0 : options.output;
	obj.click = options.click ? true : false;
	obj.group = options.group || 'Common';
	obj.options = options.options;
	obj.uninstall = options.uninstall;
	obj.state = options.state;
	obj.cloning = options.cloning;
	obj.dashboard = options.dashboard ? true : false;
	obj.flowboard = options.flowboard ? true : false;
	obj.fn = fn;
	obj.readme = options.readme || '';
	obj.html = options.html || '';
	obj.traffic = options.traffic === false ? false : true;
	obj.variables = options.variables === true ? true : false;
	obj.filename = FILENAME;
	obj.dateupdated = typeof(options.dateupdated) === 'string' ? options.dateupdated.parseDate() : null;

	var exec = function() {
		var data = U.clone(FLOW.components[name]);
		data.fn = undefined;
		data.readme = undefined;
		data.html = undefined;
		var index = MESSAGE_DESIGNER.database.findIndex('id', name);
		if (index === -1)
			MESSAGE_DESIGNER.database.push(data);
		else
			MESSAGE_DESIGNER.database[index] = data;
		EMIT('flow.register', FLOW.components[name]);
		if (FLOW.loaded) {
			FLOW.init_component(FLOW.components[name]);
			FLOW.designer();
		}
	};

	if (options.npm && options.npm.length)
		FLOW.npm(options.npm, exec);
	else
		exec();

	return FLOW;
};

FLOW.component = function(name) {
	return FLOW.components[name];
};

FLOW.instance = function(id) {
	return FLOW.instances[id];
};

FLOW.emit2 = function(name, a, b, c, d, e, f, g) {
	var keys = Object.keys(FLOW.instances);
	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		instance.$events[name] && instance.emit.call(instance, name, a, b, c, d, e, f, g);
	}
	return FLOW;
};

FLOW.clearInstances = function(isdesigner) {

	var keys = Object.keys(FLOW.instances);
	var arr = [];

	for (var i = 0; i < keys.length; i++) {
		var instance = FLOW.instances[keys[i]];

		var obj = {
			id: instance.id,
			component: instance.component,
			tab: instance.tab,
			name: instance.name,
			reference: instance.reference,
			x: instance.x,
			y: instance.y,
			connections: instance.connections,
			disabledio: instance.disabledio,
			state: instance.state,
			color: instance.color,
			notes: instance.notes,
			icon: instance.icon,
			author: instance.author,
			input: instance.input,
			output: instance.output,
			click: instance.click,
			cloning: instance.cloning,
			dashboard: instance.dashboard,
			flowboard: instance.flowboard,
			traffic: instance.traffic,
			variables: instance.variables,
			dateupdated: instance.dateupdated,
			version: instance.version,
			group: instance.group,
		};

		if (!isdesigner)
			obj.options = instance.options;

		arr.push(obj);
	}

	return arr;
};

FLOW.getOptions = function() {
	var keys = Object.keys(FLOW.instances);
	var options = {};
	for (var i = 0; i < keys.length; i++) {
		var instance = FLOW.instances[keys[i]];
		if (instance.options)
			options[keys[i]] = instance.options;
	}
	return options;
};

FLOW.changes = function(arr) {
	var add = [];
	var rem = [];
	var needinit = false;
	var refreshconn = false;

	arr.forEach(function(c) {
		if (c.type === 'add') {
			add.push(c.com);
			needinit = true;
		} else if (c.type === 'rem') {
			rem.push({ id: c.id });
			needinit = true;
		} else if (c.type === 'mov') {
			change_move(c.com);
		} else if( c.type === 'conn') {
			change_connections(c.id, c.conn);
			refreshconn = true;
		} else if( c.type === 'tabs') {
			MESSAGE_DESIGNER.tabs = c.tabs;
		}
	});

	if (needinit)
		FLOW.reset(rem, function(){
			clean_zombies(add);
			FLOW.init(add, function(){
				FLOW.save3();
				FLOW.designer();
			});
		});
	else
		FLOW.save3();

	refreshconn && FLOW.refresh_connections();
};

function change_move(c){
	var instance = FLOW.instances[c.id];
	if (instance) {
		instance.x = c.x;
		instance.y = c.y;
	}
}

function change_connections(id, conn){
	var instance = FLOW.instances[id];
	if (instance) {
		instance.connections = conn || {};
		instance.$refresh();
	}
}

FLOW.reset = function(components, callback) {

	var resetinstances = [];
	if (!components.length)
		return callback && callback(resetinstances);

	EMIT('flow.reset', components.length);
	var count = 0;
	components.wait(function(item, next) {

		var instance = FLOW.instances[item.id];
		if (!instance)
			return next();

		count++;
		EMIT('flow.close', instance);
		instance.$closed = true;
		instance.$events.close && instance.emit('close');

		if (instance.close) {
			instance.close(function() {
				instance.removeAllListeners();
				next();
			});
		} else {
			instance.removeAllListeners();
			next();
		}

		instance.status = instance.debug = instance.click = instance.emit = instance.on = instance.signal = instance.send = NOOP;
		resetinstances.push(instance);
		delete FLOW.instances[item.id];

	}, function() {
		if (count) {
			FLOW.alltraffic = {};
			FLOW.alltraffic.count = 0;
		}
		callback && callback(resetinstances);
	});
	return FLOW;
};

FLOW.hasComponent = function(name) {
	return FLOW.components[name] ? true : false;
};

FLOW.hasInstance = function(id) {
	return FLOW.instances[id] ? true : false;
};

// Init multiple components
FLOW.init = function(components, callback) {

	FLOW.loaded = true;

	if (!components || !components.length) {
		EMIT('flow.init', 0);
		callback && callback();
		return;
	}

	var count = 0;

	for (var i = 0, length = components.length; i < length; i++) {

		var com = components[i];
		if (!com)
			continue;

		var declaration = FLOW.components[com.component];
		if (!declaration) {
			// console.error('FLOW.init: component "{0}" does\'t exist.'.format(com.component));
			continue;
		}

		var instance = FLOW.instances[com.id];
		if (instance) {
			instance.name = com.name || declaration.name;
			instance.connections = com.connections;
			instance.$refresh();
			instance.$events.$reinit && instance.emit('reinit');
			continue;
		}

		instance = new Component(com);
		instance.custom = {};
		instance.connections = com.connections || {};
		FLOW.instances[com.id] = instance;
		instance.options = U.extend(U.extend({}, declaration.options || EMPTYOBJECT, true), com.options || EMPTYOBJECT, true);
		instance.cloning = declaration.cloning;
		instance.name = com.name || declaration.name;
		instance.color = com.color || declaration.color;
		instance.notes = com.notes || '';
		instance.disabledio = com.disabledio = com.disabledio || { input: [], output: [] };

		declaration.fn.call(instance, instance, declaration);
		instance.$refresh();

		if (com.state !== instance.state)
			com.state = instance.state;

		declaration.variables && instance.on('variables', function() {
			this.emit('options', this.options, this.options);
		});

		count++;
		EMIT('flow.open', instance);
	}

	EMIT('flow.init', count);

	callback && callback();

	return FLOW;
};

FLOW.variable = function(name) {
	return FLOW.variables[name];
};

FLOW.refresh_variables = function(data, client) {

	try {

		var tmp = data ? data.parseConfig() : EMPTYOBJECT;
		FLOW.$variables = data;
		FLOW.variables = tmp;

		var keys = Object.keys(FLOW.instances);
		EMIT('flow.variables', FLOW.variables);

		for (var i = 0, length = keys.length; i < length; i++) {
			var instance = FLOW.instances[keys[i]];
			instance.$events.variables && instance.emit('variables', FLOW.variables);
		}

		FLOW.save3();
		client && client.send({ type: 'variables-saved' });

	} catch (err) {
		client && client.send({ type: 'variables-error', body: err.toString() });
	}

	return FLOW;
};

// Init a single component
FLOW.init_component = function(c) {

	var declaration = FLOW.components[c.component];
	if (!declaration)
		return FLOW;

	var close = [];

	Object.keys(FLOW.instances).forEach(function(key){
		var instance = FLOW.instances[key];
		if (instance.component === c.component)
			close.push(instance);
	});

	FLOW.reset(close, function(resetinstances) {
		resetinstances.forEach(function(com){
			var instance = new Component(com);
			instance.custom = {};
			FLOW.instances[com.id] = instance;
			instance.options = U.extend(U.extend({}, declaration.options || EMPTYOBJECT, true), com.options || EMPTYOBJECT, true);
			instance.name = com.name || declaration.name;
			instance.color = com.color || declaration.color;
			instance.notes = com.notes || '';
			instance.cloning = declaration.cloning;
			instance.$refresh();
			instance.$closed = false;
			declaration.fn.call(instance, instance, declaration);

			if (com.state !== instance.state)
				com.state = instance.state;

			declaration.variables && instance.on('variables', function() {
				this.emit('options', this.options, this.options);
			});

			EMIT('flow.open', instance);
		});

		FLOW.designer();
	});


	return FLOW;
};

FLOW.send = function(message) {
	FLOW.ws && FLOW.ws.send(message);
	return FLOW;
};

FLOW.designer = function() {
	MESSAGE_DESIGNER.components = FLOW.clearInstances(true);
	FLOW.ws && FLOW.ws.send(MESSAGE_DESIGNER);
	FLOW.emit2('design');
	return FLOW;
};

FLOW.debug = function(data) {
	MESSAGE_DEBUG.body = data;
	MESSAGE_DEBUG.style = undefined;
	MESSAGE_DEBUG.id = undefined;
	FLOW.send(MESSAGE_DEBUG);
	return this;
};

// Saves new data
FLOW.save = function(data, callback) {

	for (var i = 0, length = data.components.length; i < length; i++)
		data.components[i].isnew && (data.components[i].isnew = undefined);

	MESSAGE_DESIGNER.tabs = data.tabs;
	FLOW.save2(callback);

	// Disables crash mode
	if (OPT.crashmode)
		OPT.crashmode = false;
};

// Saves current state
FLOW.save2 = function(callback) {

	clearTimeout2('flow.reconfig');

	// Remove useless connections
	FLOW.cleaner();

	var data = {};
	data.tabs = MESSAGE_DESIGNER.tabs;
	data.components = FLOW.clearInstances();
	data.version = +exports.version.replace(/(v|\.)/g, '');

	FLOW.save_designer(data, function(err){
		err && F.error(err, 'FLOW.save("designer")');
		FLOW.save_variables(FLOW.$variables, function(err){
			err && F.error(err, 'FLOW.save("variables")');
			callback && callback();
			EMIT('flow.save');
		});
	}, OPT.backup);

	FLOW.refresh_connections();
};

FLOW.save3 = function() {
	setTimeout2('flow.save3', FLOW.save2, 5000);
};

// Reads designer config file
// This function can be overwritten
// returns object
FLOW.read_designer = function(callback) {
	Fs.readFile(FILEDESIGNER, function(err, data){
		if (data)
			data = data.toString('utf8').parseJSON(true);
		callback(data);
	});
};

// Saves designer to file system
// This function can be overwritten
FLOW.save_designer = function(data, callback, backup) {

	var json = JSON.stringify(data, (k,v) => k === '$component' || k === 'README' ? undefined : v, '\t');

	Fs.writeFile(FILEDESIGNER, json, callback);

	if (backup) {
		Fs.writeFile(FILEDESIGNER.replace(/\.json/g, '-' + F.datetime.format('yyyyMMdd_HHmmss') + '.backup'), json, NOOP);
		Fs.writeFile(FILEVARIABLES.replace(/\.txt/g, '-' + F.datetime.format('yyyyMMdd_HHmmss') + '.backup'),  FLOW.$variables, NOOP);
	}
};

// Reads variables file
// This function can be overwritten
// returns string
FLOW.read_variables = function(callback) {
	Fs.readFile(FILEVARIABLES, callback);
};

// Saves variables to file system
// This function can be overwritten
FLOW.save_variables = function(data, callback) {
	Fs.writeFile(FILEVARIABLES, data, callback);
};

FLOW.refresh_connections = function() {
	var keys = Object.keys(FLOW.instances);
	FLOW.outputs = {};
	FLOW.inputs = {};
	for (var i = 0, length = keys.length; i < length; i++) {
		var com = FLOW.instances[keys[i]];

		if (!FLOW.outputs[com.id])
			FLOW.outputs[com.id] = {};

		if (!FLOW.inputs[com.id])
			FLOW.inputs[com.id] = {};

		var con = Object.keys(com.connections);
		for (var j = 0; j < con.length; j++) {
			if (con[j] == '99')
				continue;
			var tmp = com.connections[con[j]];
			for (var b = 0; b < tmp.length; b++) {
				var id = tmp[b].id;
				FLOW.outputs[com.id][id] = 1;

				if (!FLOW.inputs[id])
					FLOW.inputs[id] = {};

				if (!FLOW.inputs[com.id])
					FLOW.inputs[com.id] = {};

				if (!FLOW.outputs[id])
					FLOW.outputs[id] = {};

				FLOW.inputs[id][com.id] = 1;
			}
		}
	}
};

FLOW.clearerrors = function() {

	var arr = Object.keys(FLOW.instances);
	for (var i = 0, length = arr.length; i < length; i++)
		FLOW.instances[arr[i]].errors = undefined;

	FLOW.save3();
	FLOW.send(MESSAGE_CLEARERRORS);
	return FLOW;
};

FLOW.save_inmemory = function() {
	setTimeout2('flowinmemorysave', function() {
		Fs.writeFile(FILEINMEMORY, JSON.stringify(FLOW.inmemory), F.error());
	}, 500, 100);
};

FLOW.execute = function(filename) {

	var data = Fs.readFileSync(filename).toString('utf8');
	if (data.indexOf('exports.install') === -1 || data.indexOf('exports.id') === -1)
		return FLOW;

	var meta = Fs.statSync(filename);
	var name = require.resolve(filename);
	FILENAME = U.getName(filename);
	var m = require(filename);
	var id = m.id;

	if (!id) {
		console.log(FILENAME + ': Missing ID property, skipping.');
		return;
	}

	var install = m.install;
	delete m.id;
	delete m.install;
	m.dateupdated = meta.mtime;
	FLOW.register(id, m, install);
	(function(name, filename, fname) {
		setTimeout(function() {
			if (FILENAME === fname)
				FILENAME = '';
			delete require.cache[name];
		}, 500);
	})(name, filename, FILENAME);

	return FLOW;
};

FLOW.kill = function(callback) {
	var keys = Object.keys(FLOW.instances);
	var close = [];
	for (var i = 0; i < keys.length; i++)
		close.push(FLOW.instances[keys[i]]);
	FLOW.reset(close, callback);
};

FLOW.reload = function(type, callback) {

	if (typeof(type) === 'function') {
		callback = type;
		type = 0;
	}

	if (type === 1) {
		FLOW.kill(function() {
			MESSAGE_DESIGNER.database = [];
			FLOW.load(callback, true);
		});
	} else {
		FLOW.kill(function() {
			reload(callback);
		});
	}
};

function reload(callback) {

	// Reads variables
	FLOW.read_variables(function(err, data) {

		FLOW.$variables = data ? data.toString('utf8') : '';

		// Reads designer
		FLOW.read_designer(function(data) {

			if (!data)
				data = { components: [] };

			if (!FLOW.$variables)
				FLOW.$variables = data.variables || '';

			FLOW.variables = FLOW.$variables ? FLOW.$variables.parseConfig() : {};

			EMIT('flow.variables', FLOW.variables);

			MESSAGE_DESIGNER.tabs = data.tabs;

			data.components.forEach(function(item) {
				var declaration = FLOW.components[item.component];
				if (declaration && declaration.options)
					item.options = U.extend(U.extend({}, declaration.options || EMPTYOBJECT, true), item.options, true);
				if (!data.version) {
					// Backward compatibility
					Object.keys(item.connections).forEach(function(index) {
						var arr = item.connections[index];
						for (var i = 0; i < arr.length; i++) {
							if (typeof(arr[i]) === 'string')
								arr[i] = { index: '0', id: arr[i] };
						}
					});
				}
			});

			Fs.readFile(FILEINMEMORY, function(err, indata) {
				indata && (FLOW.inmemory = indata.toString('utf8').parseJSON(true));

				if (!FLOW.inmemory)
					FLOW.inmemory = {};

				clean_zombies(data.components);

				FLOW.init(data.components, function(){
					FLOW.designer();
					FLOW.refresh_connections();
					READY = true;
					callback && callback();
				});
			});
		});
	});
}

function clean_zombies(arr) {
	var index = 0;
	while (true) {
		if (arr.length === index)
			break;
		var item = arr[index++];
		if (item == null) {
			arr.splice(index, 1);
			index--;
		}
	}
}

// Loads components and designer cofig when flow starts
FLOW.load = function(callback, isreload) {
	var path = FLOWPATH;
	PATH.exists(path, function(e) {
		!e && Fs.mkdirSync(path);
		U.ls(path, function(files) {
			files.wait(function(filename, next) {
				FLOW.execute(filename);
				next();
			}, function() {
				reload(function() {
					if (isreload)
						EMIT('flow.reload');
					else
						EMIT('flow');
				});
			});
		}, n => U.getExtension(n) === 'js');
	});
	return FLOW;
};

FLOW.set = function(key, value) {
	FLOW.inmemory[key] = value;
	FLOW.save_inmemory();
	return FLOW;
};

FLOW.get = function(key) {
	return FLOW.inmemory[key];
};

FLOW.trigger = function(name, fn) {
	if (fn)
		FLOW.triggers[name] = fn;
	else
		delete FLOW.triggers[name];
	return FLOW;
};

FLOW.rem = function(key) {
	delete FLOW.inmemory[key];
	FLOW.save_inmemory();
	return FLOW;
};

// ci = message count in input
// co = message count in output
// ni = new messages on input
// no = new messages on output
FLOW.traffic = function(id, type, count, index) {
	!FLOW.alltraffic[id] && (FLOW.alltraffic[id] = { input: 0, output: 0, pending: 0, duration: 0, ci: 0, co: 0, ni: 0, no: 0 });
	var k;
	switch (type) {
		case 'pending':
		case 'duration':
		case 'ci':
		case 'co':
			FLOW.alltraffic[id][type] = count;
			break;
		case 'output':
			FLOW.alltraffic[id][type]++;
			FLOW.alltraffic[id].no++;
			if (index != null && index < 10) {
				k = 'no' + index;
				if (FLOW.alltraffic[id][k])
					FLOW.alltraffic[id][k]++;
				else
					FLOW.alltraffic[id][k] = 1;
			}
			FLOW.alltraffic.count++;
			break;

		case 'input':
			if (count !== true)
				FLOW.alltraffic[id][type]++;
			FLOW.alltraffic[id].ni++;
			break;

		default:
			FLOW.alltraffic[id][type]++;
			break;

	}
	return FLOW;
};

FLOW.trafficreset = function() {
	var keys = Object.keys(FLOW.alltraffic);
	FLOW.alltraffic.count = 0;
	for (var i = 0, length = keys.length; i < length; i++) {
		if (keys[i] !== 'count' && keys[i] !== 'pending') {
			var item = FLOW.alltraffic[keys[i]];
			item.input = 0;
			item.output = 0;
			item.ni = 0;
			item.no = 0;
			item.no0 && (item.no0 = 0);
			item.no1 && (item.no1 = 0);
			item.no2 && (item.no2 = 0);
			item.no3 && (item.no3 = 0);
			item.no4 && (item.no4 = 0);
			item.no5 && (item.no5 = 0);
			item.no6 && (item.no6 = 0);
			item.no7 && (item.no7 = 0);
			item.no8 && (item.no8 = 0);
			item.no9 && (item.no9 = 0);
		}
	}
	return FLOW;
};

FLOW.npm = function(dependencies, callback) {

	if (!dependencies || !dependencies.length) {
		callback && callback();
		return;
	}

	var path = PATH.root('node_modules/');
	PATH.exists(path, function(e) {
		!e && Fs.mkdirSync(path);
		dependencies.wait(function(item, next) {
			var index = item.indexOf('@');
			var filename = path + (index === -1 ? item : item.substring(0, index));

			PATH.exists(filename, function(e) {

				if (e) {
					next();
					return;
				}

				var arg = {};

				arg.cwd = path;

				if (process.getuid && process.getuid() === 33)
					arg.env = { NPM_CONFIG_CACHE: '/var/www/.npm' };

				OPT.logging && FLOW.log('npm', item);

				Exec('npm install ' + item, arg, function(err) {
					OPT.logging && FLOW.log('npm', item + (err ? (' - ' + err.toString()) : ''));
					err && console.error('NPM INSTALL: ' + item, err);
					next();
				});
			});
		}, callback);
	});
};

function download_template(url, client) {
	RESTBuilder.GET(url).callback(function(err, response) {
		if (err) {
			MESSAGE_ERROR.body = err.toString();
			FLOW.send(MESSAGE_ERROR);
		} else {
			MESSAGE_TEMPLATE.body = JSON.stringify(response);
			client && client.send(MESSAGE_TEMPLATE);
		}
	});
}

FLOW.install = function(filename, body, callback) {

	if (typeof(body) !== 'string') {
		callback = body;
		body = undefined;
	}

	var u = filename.substring(0, 6);
	if (u === 'http:/' || u === 'https:') {
		var target = FLOWPATH + U.getName(filename);
		DOWNLOAD(filename, target, function(err) {
			if (err) {
				MESSAGE_ERROR.body = err.toString();
				FLOW.send(MESSAGE_ERROR);
			} else
				FLOW.execute(target);
			callback && callback(err);
		});
	} else {

		if (body.indexOf('exports.install') === -1 || body.indexOf('exports.id') === -1) {
			callback && callback(new Error('Invalid file.'));
			return;
		}

		if (filename)
			filename = FLOWPATH + filename;
		else
			filename = FLOWPATH + U.GUID(10) + '.js';

		Fs.writeFile(filename, body, function(err) {
			err && F.error(err, 'FLOW.install("{0}")'.format(filename));
			FLOW.execute(filename);
			callback && callback(null);
		});
	}

	return FLOW;
};

// Removes removed connections
FLOW.cleaner = function() {

	var keys = Object.keys(FLOW.instances || {});

	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		Object.keys(instance.connections).forEach(function(key) {
			var con = instance.connections[key];
			instance.connections[key] = con.remove(n => FLOW.instances[n.id] == null);
			!instance.connections[key].length && (delete instance.connections[key]);
		});
	}
};

FLOW.uninstall = function(name, noSync) {

	var close = [];
	var keys = Object.keys(FLOW.instances);

	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		if (instance.component === name)
			close.push(instance);
	}

	FLOW.reset(close, function() {
		var com = FLOW.components[name];
		com.uninstall && com.uninstall();
		close = [];
		MESSAGE_DESIGNER.database = MESSAGE_DESIGNER.database.remove('id', name);

		if (!noSync) {
			Fs.unlink(FLOWPATH + com.filename, NOOP);
			FLOW.designer;
			FLOW.save2();
		}
	});

	return FLOW;
};

FLOW.find = function(fn) {

	if (!fn || typeof(fn) !== 'function')
		return;

	var arr = [];
	var keys = Object.keys(FLOW.instances);

	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		fn(instance, FLOW.components[instance.component]) && arr.push(instance);
	}
	return arr;
};

FLOW.findByReference = function(value) {
	var arr = [];
	var keys = Object.keys(FLOW.instances);
	var is = value.test ? true : false;
	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		if (is)
			value.test(instance.reference) && arr.push(instance);
		else
			instance.reference === value && arr.push(instance);	}
	return arr;
};

FLOW.findByName = function(value) {
	var arr = [];
	var keys = Object.keys(FLOW.instances);
	var is = value.test ? true : false;
	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		if (is)
			value.test(instance.name) && arr.push(instance);
		else
			instance.name === value && arr.push(instance);	}
	return arr;
};

FLOW.findByComponent = function(value) {
	var arr = [];
	var keys = Object.keys(FLOW.instances);
	var is = value.test ? true : false;
	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		if (is)
			value.test(instance.component) && arr.push(instance);
		else
			instance.component === value && arr.push(instance);
	}
	return arr;
};

FLOW.findById = function(id) {
	return FLOW.instances[id];
};

FLOW.prototypes = function(fn) {
	var proto = {};
	proto.FlowData = FlowData.prototype;
	proto.Component = Component.prototype;
	fn.call(proto, proto);
	return FLOW;
};

FLOW.log = function(msg, data, client) {

	if (data instanceof Component) {
		var tmp = data;
		data = '[' + tmp.id + ': ' + (tmp.name || tmp.component) + (tmp.reference ? ' (' + tmp.reference + ')' : '') + ']';
	}

	if (data)
		LOGGER('flow', msg, 'user: ' + (client ? client.ip : 'system'), data);
	else
		LOGGER('flow', msg, 'user: ' + (client ? client.ip : 'system'));

	return FLOW;
};

// ===================================================
// FLOW DATA DECLARATION
// ===================================================

function FlowData(data, clone, index) {
	this.id = clone ? clone.id : COUNTER++;
	this.index = clone ? clone.index : (index || 0);
	this.begin = clone ? clone.begin : new Date();
	this.repository = clone ? clone.repository : {};
	this.data = data;
	this.completed = clone ? clone.completed : false;
	this.parent = clone ? clone.parent : {};
}

FlowData.prototype.free = function() {
	this.data = undefined;
	this.repository = undefined;
	return this;
};

FlowData.prototype.clone = function() {
	var type = typeof(this.data);
	var noclone = !this.data || type === 'string' || type === 'number' || type === 'boolean' || this.data instanceof Date || this.data instanceof ErrorBuilder || this.data instanceof Controller || this.data instanceof Error;
	return new FlowData(noclone ? this.data : clone(this.data), this);
};

FlowData.prototype.rewrite = function(data) {
	this.data = data;
	return this;
};

FlowData.prototype.set = function(key, value) {
	this.repository[key] = value;
	return this;
};

FlowData.prototype.get = function(key) {
	return this.repository[key];
};

FlowData.prototype.rem = function(key) {
	this.repository[key] = undefined;
	return this;
};

FlowData.prototype.arg = function(str) {
	var self = this;
	if (typeof(str) === 'object' && str) {
		var keys = Object.keys(str);
		var output = {};
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			var val = str[key];
			if (typeof(val) === 'string')
				output[key] = self.arg(val);
			else
				output[key] = val;
		}
		return output;
	} else {
		return typeof(str) === 'string' ? str.replace(REGPARAM, function(text) {
			var val = self.repository[text.substring(1, text.length - 1).trim()];
			return val == null ? text : val;
		}) : str;
	}
};
