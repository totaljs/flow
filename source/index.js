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
const MESSAGE_ERROR = { type: 'error' };
const MESSAGE_ERRORS = { type: 'errors' };
const MESSAGE_CLEARERRORS = { type: 'clearerrors' };
const PATH = '/flow/';
const FILEDESIGNER = '/flow/designer.json';
const FILEINMEMORY = '/flow/repository.json';

var OPT;
var DDOS = {};
var FILENAME;

global.FLOW = { components: {}, instances: {}, inmemory: {}, triggers: {}, alltraffic: { count: 0 }, indexer: 0, loaded: false, url: '', $events: {} };

exports.version = 'v1.0.0';
exports.install = function(options) {

	// options.restrictions = ['127.0.0.1'];
	// options.url = '/$flow/';
	// options.auth = ['petersirka:123456'];
	// or --> adds authorize flag
	// options.auth = true;
	// options.token = 'qR3878SAadada';
	// options.limit = 50;

	OPT = options;
	!OPT && (OPT = {});

	if (OPT.auth instanceof Array) {
		OPT.baa = {};
		OPT.auth.forEach(function(user) {
			var hash = user.hash().toString();
			OPT.baa[hash] = user;
		});
	}

	OPT.url = U.path(OPT.url || '/$flow/');

	if (!OPT.limit)
		OPT.limit = 50;

	// Routes
	if (OPT.auth === true) {
		F.route(OPT.url, view_index, ['authorize']);
		F.websocket(OPT.url, websocket, ['authorize', 'json'], OPT.limit);
	} else {
		F.route(OPT.url, view_index);
		F.websocket(OPT.url, websocket, ['json'], OPT.limit);
	}

	// Merging && Mapping
	F.merge(OPT.url + 'default.css', '@flow/dep.min.css', '@flow/default.css', '@flow/ui.css');
	F.merge(OPT.url + 'default.js', '@flow/dep.min.js', '@flow/default.js', '@flow/ui.js');
	F.map(OPT.url + 'templates/', '@flow/templates/');
	F.map(OPT.url + 'templates/', '@flow/templates/');
	F.map(OPT.url + 'fonts/', '@flow/fonts/');
	F.map(OPT.url + 'img/', '@flow/img/');

	// Localization
	F.localize(OPT.url + 'templates/*.html', ['compress']);

	try {
		Fs.mkdirSync(F.path.root(PATH));
	} catch(e) {}

	// Binds URL
	FLOW.url = OPT.url;

	// ViewEngine helper
	F.helpers.FLOW = FLOW;

	// Load flow's data
	FLOW.load();

	F.on('service', service);

	setInterval(function() {

		FLOW.indexer++;

		if (FLOW.ws) {
			MESSAGE_TRAFFIC.body = FLOW.alltraffic;
			MESSAGE_TRAFFIC.memory = process.memoryUsage().heapUsed.filesize();
			FLOW.ws.send(MESSAGE_TRAFFIC);
		}

		if (FLOW.indexer % 5 === 0) {
			FLOW.reset_traffic();
			FLOW.indexer = 0;
		}

	}, 3000);
};

function service(counter) {
	counter % 5 === 0 && (DDOS = {});
	FLOW.reset_traffic();
	FLOW.emit('service', counter);
}

function view_index() {
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
				this.baa('Secured area, please add sign-in');
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
		DDOS[this.ip] > 4 && this.throw401();
		return;
	}

	this.repository.url = OPT.url;
	this.view('@flow/index');
}

function websocket() {
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

		if (client.query.designer === '1') {
			client.send(MESSAGE_DESIGNER);
			FLOW.emit('designer');
		}
	});

	self.on('message', function(client, message) {

		var component;

		if (message.type === 'readme') {
			component = FLOW.components[message.target];
			MESSAGE_STATIC.id = message.id;
			MESSAGE_STATIC.body = component ? TRANSLATOR(self.language || 'default', component.readme) : '';
			client.send(MESSAGE_STATIC);
			return;
		}

		if (message.type === 'html') {
			component = FLOW.components[message.target];
			MESSAGE_STATIC.id = message.id;
			MESSAGE_STATIC.body = U.minifyHTML(component ? TRANSLATOR(self.language || 'default', component.html) : '');
			client.send(MESSAGE_STATIC);
			return;
		}

		if (message.type === 'clearerrors') {
			FLOW.clearerrors();
			return;
		}

		if (message.type === 'install') {
			FLOW.install(message.filename, message.body);
			return;
		}

		if (message.type === 'uninstall') {
			FLOW.uninstall(message.target);
			return;
		}

		if (message.target) {
			var instance = FLOW.instances[message.target];
			if (!instance)
				return;
			if (message.type === 'options') {
				var old_options = instance.options;
				instance.options = message.body;
				instance.name = instance.options.comname;
				instance.reference = instance.options.comreference;
				instance.output = instance.options.comoutput;
				instance.options.comname = undefined;
				instance.options.comreference = undefined;
				instance.options.comoutput = undefined;

				if (instance.output != null) {
					var count = instance.output instanceof Array ? instance.output.length : instance.output;
					Object.keys(instance.connections).forEach(function(key) {
						var index = +key;
						index >= count && (delete instance.connections[key]);
					});
				}

				instance.$events.options && instance.emit('options', instance.options, old_options);

				var tmp = MESSAGE_DESIGNER.components.findItem('id', message.target);
				if (tmp) {
					tmp.options = instance.options;
					tmp.name = instance.name;
					tmp.output = instance.output;
					tmp.connections = instance.connections;
					FLOW.save2();
				}
			} else
				instance.$events[message.event] && instance.emit(message.event, message.body);
			return;
		}

		if (message.type === 'trigger') {
			var trigger = FLOW.triggers[message.name];
			if (trigger) {
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

		message.type === 'apply' && FLOW.save(message.body);
	});

	FLOW.ws = self;
}

// ===================================================
// COMPONENT INSTANCE DECLARATION
// ===================================================

function Component(options) {
	U.extend(this, options);
	this.state = { text: '', color: 'gray' };
	this.$events = {};
}

Component.prototype.emit = function(name, a, b, c, d, e, f, g) {
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
	return FLOW.rem('$' + this.id + key);
};

Component.prototype.log = function(a, b, c, d, e, f) {
	F.logger(this.component, a, b, c, d, e, f);
	return this;
};

Component.prototype.click = function() {
	try {
		this.$events.click && this.emit('click');
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
	if (!self.connections)
		return self;

	if (index) {
		var conn = self.connections[index];
		conn && conn.$events.signal && conn.emit('signal', data, self);
	} else {
		var keys = Object.keys(self.connections);
		for (var i = 0, length = keys.length; i < length; i++)
			self.connections[i].$events.signal && self.connections[i].emit('signal', data, self);
	}

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

	message.tracking.push(self);
	message.parent = self;

	FLOW.traffic(self.id, 'output');

	if (!connections) {
		message.completed = true;
		return message;
	}

	var arr = Object.keys(connections);
	if (!arr.length) {
		message.completed = true;
		return message;
	}

	var instance;

	if (index === undefined) {
		setImmediate(function() {
			if (self.$closed)
				return;
			for (var i = 0, length = arr.length; i < length; i++) {
				var ids = connections[arr[i]];
				var canclone = true;
				for (var j = 0, jl = ids.length; j < jl; j++) {
					instance = FLOW.instances[ids[j]];
					if (instance && !instance.$closed) {
						FLOW.traffic(instance.id, 'input');
						try {
							instance.$events.data && instance.emit('data', canclone && (instance.cloning || instance.cloning === undefined) ? message.clone() : message);
						} catch (e) {
							instance.error(e, self.id);
						}
					}
				}
			}
		});
	} else {
		arr = connections[index.toString()];

		if (!arr || !arr.length) {
			message.completed = true;
			return message;
		}

		var canclone = arr.length > 1;
		setImmediate(function() {
			if (self.$closed)
				return;
			for (var i = 0, length = arr.length; i < length; i++) {
				instance = FLOW.instances[arr[i]];
				if (instance && !instance.$closed) {
					FLOW.traffic(instance.id, 'input');
					try {
						instance.$events.data && instance.emit('data', canclone && (instance.cloning || instance.cloning === undefined) ? message.clone() : message);
					} catch (e) {
						instance.error(e, self.id);
					}
				}
			}
		});
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
		MESSAGE_DESIGNER.components && (MESSAGE_DESIGNER.components.findItem('id', self.id).errors = self.errors);
		FLOW.send(MESSAGE_ERRORS);
	}, 100);
	return this;
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
	var com = MESSAGE_DESIGNER.components.findItem('id', this.id);
	if (com) {
		com.state = this.state;
		FLOW.send(MESSAGE_STATUS);
	}
	return this;
};

Component.prototype.debug = function(data, style) {
	MESSAGE_DEBUG.body = data instanceof FlowData ? data.data instanceof Buffer ? print_buffer(data.data) : data.data : data instanceof Buffer ? print_buffer(data) : data;
	MESSAGE_DEBUG.style = style || 'info';
	MESSAGE_DEBUG.id = this.id;
	FLOW.send(MESSAGE_DEBUG);
	return this;
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
	return F;
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
	return F;
};

FLOW.removeAllListeners = function(name) {
	if (name)
		FLOW.$events[name] = undefined;
	else
		FLOW.$events = {};
	return F;
};

FLOW.register = function(name, options, fn) {

	if (typeof(options) === 'function') {
		fn = options;
		options = EMPTYOBJECT;
	}

	var id = name.slug().replace(/\-/g, '');

	FLOW.components[name] = {
		id: id,
		component: name,
		name: options.title || name,
		author: options.author || 'Unknown',
		color: options.color,
		input: options.input == null ? false : options.input,
		output: options.output == null ? 0 : options.output,
		click: options.click ? true : false,
		group: options.group || 'Common',
		options: options.options,
		uninstall: options.uninstall,
		status: options.status,
		fn: fn,
		readme: options.readme || '',
		html: options.html || '',
		filename: FILENAME
	};

	var exec = function() {
		var data = U.clone(FLOW.components[name]);
		data.fn = undefined;
		var index = MESSAGE_DESIGNER.database.findIndex('id', name);
		if (index === -1)
			MESSAGE_DESIGNER.database.push(data);
		else
			MESSAGE_DESIGNER.database[index] = data;
		EMIT('flow.register', FLOW.components[name]);
		if (FLOW.loaded) {
			FLOW.init_component(FLOW.components[name]);
			FLOW.send(MESSAGE_DESIGNER);
		}
	};

	if (options.dependencies && options.dependencies.length)
		FLOW.npm(options.dependencies, exec);
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

FLOW.emit = function() {
	var keys = Object.keys(FLOW.instances);
	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		instance.emit.apply(instance, arguments);
	}
	return FLOW;
};

FLOW.reset = function(components, callback) {

	if (!components.length)
		return callback && callback();

	EMIT('flow.reset', components.length);
	var count = 0;
	components.wait(function(item, next) {

		var instance = FLOW.instances[item.id];
		if (!instance)
			return next();

		count++;
		EMIT('flow.close', instance);
		instance.$closed = true;
		FLOW.debug('Closing ' + instance.name);
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
		delete FLOW.instances[item.id];
	}, function() {
		if (count) {
			FLOW.alltraffic = {};
			FLOW.alltraffic.count = 0;
		}
		callback && callback();
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
FLOW.init = function(components) {

	var close = [];

	Object.keys(FLOW.instances).forEach(function(key) {
		var instance = FLOW.instances[key];
		components.findIndex('id', instance.id) === -1 && close.push(instance);
	});

	FLOW.reset(close, function() {

		FLOW.loaded = true;

		if (!components || !components.length) {
			EMIT('flow.init', 0);
			return;
		}

		var count = 0;

		for (var i = 0, length = components.length; i < length; i++) {

			var com = components[i];
			var instance = FLOW.instances[com.id];
			if (instance) {
				instance.name = com.name;
				instance.connections = com.connections;
				instance.$events.$reinit && instance.emit('reinit');
				continue;
			}

			var declaration = FLOW.components[com.component];
			if (!declaration) {
				// console.error('FLOW.init: component "{0}" does\'t exist.'.format(com.component));
				continue;
			}

			instance = new Component(com);
			instance.custom = {};
			FLOW.instances[com.id] = instance;
			instance.options = U.extend(U.extend({}, declaration.options || EMPTYOBJECT, true), com.options || EMPTYOBJECT, true);
			instance.name = com.name;
			declaration.fn.call(instance, instance, declaration);

			if (com.state !== instance.state)
				com.state = instance.state;

			count++;
			EMIT('flow.open', instance);
		}

		EMIT('flow.init', count);
	});

	return FLOW;
};

// Init the only one component
FLOW.init_component = function(component) {
	MESSAGE_DESIGNER.components.wait(function(com, next) {
		if (com.component !== component.id)
			return next();
		var declaration = FLOW.components[com.component];
		if (!declaration)
			return next();

		var close = [];
		var instance = FLOW.instances[com.id];

		instance && close.push(instance);

		FLOW.reset(close, function() {
			instance = new Component(com);
			instance.custom = {};
			FLOW.instances[com.id] = instance;
			instance.options = U.extend(U.extend({}, declaration.options || EMPTYOBJECT, true), com.options || EMPTYOBJECT, true);
			instance.name = com.name;
			declaration.fn.call(instance, instance, declaration);

			if (com.state !== instance.state)
				com.state = instance.state;

			EMIT('flow.open', instance);
			FLOW.send(MESSAGE_DESIGNER);
			next();
		});
	});

	return FLOW;
};

FLOW.send = function(message) {
	FLOW.ws && FLOW.ws.send(message);
	return FLOW;
};

FLOW.debug = function(data, style) {
	MESSAGE_DEBUG.body = data;
	MESSAGE_DEBUG.style = style;
	MESSAGE_DEBUG.id = undefined;
	FLOW.send(MESSAGE_DEBUG);
	return this;
};

// Saves new date
FLOW.save = function(data, callback) {
	for (var i = 0, length = data.components.length; i < length; i++)
		data.components[i].isnew && (data.components[i].isnew = undefined);
	MESSAGE_DESIGNER.tabs = data.tabs;
	MESSAGE_DESIGNER.components = data.components;
	MESSAGE_DESIGNER.components && FLOW.init(MESSAGE_DESIGNER.components);
	FLOW.save2(callback);
};

FLOW.clearerrors = function() {

	var arr = Object.keys(FLOW.instances);
	for (var i = 0, length = arr.length; i < length; i++)
		FLOW.instances[arr[i]].errors = undefined;

	if (MESSAGE_DESIGNER && MESSAGE_DESIGNER.components) {
		for (var i = 0, length = MESSAGE_DESIGNER.components.length; i < length; i++)
			MESSAGE_DESIGNER.components[i].errors = undefined;
	}

	FLOW.send(MESSAGE_CLEARERRORS);
	FLOW.save2(NOOP);
	return FLOW;
};

// Saves current state
FLOW.save2 = function(callback) {
	var data = {};
	data.tabs = MESSAGE_DESIGNER.tabs;
	data.components = MESSAGE_DESIGNER.components;
	Fs.writeFile(F.path.root(FILEDESIGNER), JSON.stringify(data, (k,v) => k === '$component' ? undefined : v), function() {
		callback && callback();
	});
};

FLOW.save_inmemory = function() {
	setTimeout2('flowinmemorysave', function() {
		Fs.writeFile(F.path.root(FILEINMEMORY), JSON.stringify(FLOW.inmemory), NOOP);
	}, 500);
};

FLOW.execute = function(filename) {
	var name = require.resolve(filename);
	FILENAME = U.getName(filename);
	var m = require(filename);
	var id = m.id;
	var install = m.install;
	delete m.id;
	delete m.install;
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

// Loads data when flow is starting
FLOW.load = function(callback) {

	var path = F.path.root(PATH);
	F.path.exists(path, function(e) {
		!e && Fs.mkdirSync(path);
		U.ls(path, function(files) {
			files.wait(function(filename, next) {
				FLOW.execute(filename);
				next();
			}, function() {
				Fs.readFile(F.path.root(FILEDESIGNER), function(err, data) {

					if (data)
						data = data.toString('utf8').parseJSON(true);
					else
						data = {};

					MESSAGE_DESIGNER.tabs = data.tabs;
					MESSAGE_DESIGNER.components = data.components || [];

					MESSAGE_DESIGNER.components.forEach(function(item) {
						var declaration = FLOW.components[item.component];
						if (declaration && declaration.options)
							item.options = U.extend(U.extend({}, declaration.options || EMPTYOBJECT, true), item.options, true);
					});

					Fs.readFile(F.path.root(FILEINMEMORY), function(err, data) {
						data && (FLOW.inmemory = data.toString('utf8').parseJSON(true));
						EMIT('flow');
						FLOW.init(MESSAGE_DESIGNER.components);
						FLOW.send(MESSAGE_DESIGNER);
						callback && callback();
					});
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

FLOW.traffic = function(id, type) {
	!FLOW.alltraffic[id] && (FLOW.alltraffic[id] = { input: 0, output: 0 });
	FLOW.alltraffic[id][type]++;
	type === 'output' && (FLOW.alltraffic.count++);
	return FLOW;
};

FLOW.reset_traffic = function() {
	var keys = Object.keys(FLOW.alltraffic);
	FLOW.alltraffic.count = 0;
	for (var i = 0, length = keys.length; i < length; i++) {

		if (keys[i] === 'count')
			continue;

		var item = FLOW.alltraffic[keys[i]];
		item.input = 0;
		item.output = 0;
	}
	return FLOW;
};

FLOW.npm = function(dependencies, callback) {
	if (!dependencies || !dependencies.length)
		return callback();
	var path = F.path.root('node_modules/');
	F.path.exists(path, function(e) {
		!e && Fs.mkdirSync(path);
		dependencies.wait(function(item, next) {
			var index = item.indexOf('@');
			var filename = path + (index === -1 ? item : item.substring(0, index));
			F.path.exists(filename, function(e) {
				if (e)
					return next();
				Exec('npm install ' + item, { cwd: path }, function(err) {
					err && console.error('NPM INSTALL: ' + item, err);
					next();
				});
			});
		});
	});
};

FLOW.install = function(filename, body, callback) {

	if (typeof(body) !== 'string') {
		callback = body;
		body = undefined;
	}

	var u = filename.substring(0, 6);
	if (u === 'http:/' || u === 'https:') {
		U.download(filename, ['get'], function(err, response) {

			if (err) {
				MESSAGE_ERROR.body = err.toString();
				FLOW.send(MESSAGE_ERROR);
				return callback(err);
			}

			filename = F.path.root(PATH + U.getName(filename));
			var writer = Fs.createWriteStream(filename);
			response.pipe(writer);
			writer.on('finish', function() {
				FLOW.execute(filename);
				callback && callback(null);
			});
		});
	} else {

		if (body.indexOf('exports.install') === -1 || body.indexOf('exports.id') === -1)
			return;

		if (filename)
			filename = F.path.root(PATH + filename);
		else
			filename = F.path.root(PATH, U.GUID(10) + '.js');

		Fs.writeFile(filename, body, function() {
			FLOW.execute(filename);
			callback && callback(null);
		});
	}

	return FLOW;
};

FLOW.uninstall = function(name) {

	var close = [];
	var connections = [];
	var keys = Object.keys(FLOW.instances);

	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		if (instance.component === name) {
			close.push(instance);
			connections.push(instance.id);
		}
	}

	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		Object.keys(instance.connections).forEach(function(key) {
			instance.connections[key] = instance.connections[key].remove(n => connections.indexOf(n) !== -1);
			!instance.connections[key].length && (delete instance.connections[key]);
		});
	}

	MESSAGE_DESIGNER.components.forEach(function(item) {
		Object.keys(item.connections).forEach(function(key) {
			item.connections[key] = item.connections[key].remove(n => connections.indexOf(n) !== -1);
			!item.connections[key].length && (delete item.connections[key]);
		});
	});

	FLOW.reset(close, function() {
		var com = FLOW.components[name];
		com.uninstall && com.uninstall();
		Fs.unlink(F.path.root(PATH + com.filename), NOOP);
		close = [];
		MESSAGE_DESIGNER.components = MESSAGE_DESIGNER.components.remove('component', name);
		MESSAGE_DESIGNER.database = MESSAGE_DESIGNER.database.remove('id', name);
		FLOW.send(MESSAGE_DESIGNER);
		FLOW.save2();
	});

	return FLOW;
};

FLOW.findByReference = function(value) {
	var arr = [];
	var keys = Object.keys(FLOW.instances);
	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		instance.reference === value && arr.push(instance);
	}
	return arr;
};

FLOW.findByName = function(value) {
	var arr = [];
	var keys = Object.keys(FLOW.instances);
	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		instance.name === value && arr.push(instance);
	}
	return arr;
};

FLOW.findByComponent = function(value) {
	var arr = [];
	var keys = Object.keys(FLOW.instances);
	for (var i = 0, length = keys.length; i < length; i++) {
		var instance = FLOW.instances[keys[i]];
		instance.component === value && arr.push(instance);
	}
	return arr;
};

FLOW.findById = function(id) {
	return FLOW.instances[id];
};

// ===================================================
// FLOW DATA DECLARATION
// ===================================================

function FlowData(data, clone) {
	this.begin = clone ? clone.begin : new Date();
	this.repository = clone ? clone.repository : {};
	this.data = data;
	this.completed = clone ? clone.completed : false;
	this.tracking = clone ? clone.tracking : [];
	this.parent = clone ? clone.parent : {};
}

FlowData.prototype.free = function() {
	this.tracking = undefined;
	this.data = undefined;
	this.repository = undefined;
	return this;
};

FlowData.prototype.clone = function() {
	var type = typeof(this.data);
	var noclone = !this.data || type === 'string' || type === 'number' || type === 'boolean' || this.data instanceof Date;
	return new FlowData(noclone ? this.data : clone(this.data), this);
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

