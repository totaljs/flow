const Fs = require('fs');
const Util = require('util');
const Exec = require('child_process').exec;
const EventEmitter = require('events');
const ERR = '------- ERROR: ';

process.on('exit', function() {
	console.log('');
});

global.assert = require('assert');

var DEBUG = true;

global.FLOW = { component: null, current: null, inmemory: {}, triggers: {} };

function log(name, data, index) {

	if (data instanceof FlowData)
		data = data.data;

	DEBUG && console.log(new Date().format('HH:mm:ss') + (' ' + name + (index === undefined ? '' : ' (' + index + ')')).padRight(22, ' '), '|', data instanceof Buffer ? data : JSON.stringify(data));
}

function Component(options) {
	U.extend(this, options);
}

Util.inherits(Component, EventEmitter);

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

Component.prototype.click = function() {
	return this.emit('click');
};

Component.prototype.signal = function(index, data) {
	log('instance.signal', data, index);
	EMIT('flow.signal', index, data);
	return this;
};

Component.prototype.send = function(index, message) {

	if (message === undefined) {
		message = index;
		index = undefined;
	}

	log('instance.send', message, index == null ? 'A' : index);

	if (!(message instanceof FlowData))
		message = new FlowData(message);

	var self = this;
	var connections = self.connections;

	message.tracking.push(self);
	message.parent = self;

	EMIT('flow.send', index, message);
	return this;
};

Component.prototype.status = function(text, color) {
	this.state = { text: text || '', color: color || 'gray' };
	log('instance.status', this.state);
	EMIT('flow.status', text, color);
	return this;
};

Component.prototype.debug = function(data, style) {
	log('instance.debug', data);
	EMIT('flow.debug', data, style || 'info');
	return this;
};

FLOW.register = function(name, options, fn) {

	if (typeof(options) === 'function') {
		fn = options;
		options = EMPTYOBJECT;
	}

	var id = name.slug().replace(/\-/g, '');
	var close = [];

	console.log('============================================================');
	console.log('Total.js Flow Test Interface');
	console.log('Component: "{0}"'.format(name));
	console.log('Author: {0}'.format(options.author || 'unknown'));
	console.log('Version: {0}'.format(options.version || '0.0.0'));
	console.log('Date: ' + new Date().format('yyyy-MM-dd HH:mm:ss'));
	console.log('------------------------------------------------------------');
	console.log('');

	FLOW.component = {
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
		fn: fn,
		readme: options.readme || '',
		html: options.html || ''
	};

	var exec = function() {
		EMIT('flow.register', FLOW.component);
		FLOW.current = new Component(FLOW.component);
		FLOW.current.custom = {};
		FLOW.current.options = U.extend(U.extend({}, FLOW.component.options || EMPTYOBJECT, true), FLOW.component.options || EMPTYOBJECT, true);
		FLOW.current.name = FLOW.component.name;
		FLOW.current.fn.call(FLOW.current, FLOW.current, FLOW.component);
		setTimeout(function() {
			global.FLOWINSTANCE = FLOW.current;
			EMIT('flow.ready');
		}, 50);
	};

	if (options.dependencies && options.dependencies.length)
		FLOW.npm(options.dependencies, exec);
	else
		exec();

	return FLOW;
};

FLOW.emit = function() {
	FLOW.current.emit.apply(FLOW.current, arguments);
	return FLOW;
};

FLOW.set = function(key, value) {
	FLOW.inmemory[key] = value;
	return FLOW;
};

FLOW.get = function(key) {
	var val = FLOW.inmemory[key];
	return val;
};

FLOW.trigger = function(name, fn) {
	FLOW.triggers[name] = fn;
	return FLOW;
};

FLOW.rem = function(key) {
	delete FLOW.inmemory[key];
	return FLOW;
};

FLOW.debug = function(data, style) {
	log('flow.debug', data);
	return FLOW;
};

global.FLOWINIT = function(obj) {
	var id = obj.id;
	var install = obj.install;
	delete obj.id;
	delete obj.install;
	FLOW.register(id, obj, install);
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
		}, callback);
	});
};

function FlowData(data) {
	this.begin = new Date();
	this.repository = {};
	this.data = data;
	this.completed = false;
	this.tracking = [];
}

FlowData.prototype.free = function() {
	this.tracking = undefined;
	this.data = undefined;
	this.repository = undefined;
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

global.FLOWSIGNAL = function(data) {
	FLOW.current.emit('signal', data, EMPTYOBJECT);
};

global.FLOWCLICK = function() {
	FLOW.current.emit('click');
};

global.FLOWEMIT = function(name, data) {
	FLOW.current.emit(name, data);
};

global.FLOWOPTIONS = function(options) {
	var instance = FLOW.current;
	var old_options = instance.options;
	instance.options = options;
	instance.name = instance.options.name;
	instance.reference = instance.options.reference;
	instance.emit('options', instance.options, old_options);
	log('instance.options', instance.options);
	EMIT('flow.options', instance.options, old_options);
};

global.FLOWUNINSTALL = function() {
	FLOW.component.uninstall();
};

global.FLOWTRIGGER = function(name, data) {
	var fn = FLOW.triggers[name];
	if (fn)
		fn(function(response) {
			log('flow.trigger ({0}) -->'.format(name), JSON.stringify(response));
		}, data);
	else
		console.error(ERR + 'trigger ({0}) --> not found'.format(name));
};

global.FLOWDATA = function(data) {
	data = new FlowData(data);
	FLOW.current.emit('data', data);
	EMIT('flow.data', data);
};

global.FLOWDEBUG = function(enable) {
	DEBUG = enable;
};

global.FLOWCLOSE = function(callback) {
	var instance = FLOW.current;
	EMIT('flow.close', instance);
	instance.$closed = true;
	// FLOW.debug('Closing ' + instance.name);
	instance.emit('close');
	if (instance.close) {
		instance.close(function() {
			instance.removeAllListeners();
			callback && callback();
		});
	} else {
		instance.removeAllListeners();
		callback && callback();
	}
};