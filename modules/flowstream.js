// FlowStream module
// The MIT License
// Copyright 2021-2022 (c) Peter Širka <petersirka@gmail.com>

if (!global.F)
	require('total4');

const W = require('worker_threads');
const Fork = require('child_process').fork;
const VERSION = 24;

var isFLOWSTREAMWORKER = false;
var Parent = W.parentPort;
var CALLBACKS = {};
var FLOWS = {};
var TMS = {};
var CALLBACKID = 1;

/*
	var instance = MODULE('flowstream').init({ components: {}, design: {}, variables: {}, variables2: {} }, true/false);

	Module exports:
	module.init(meta [isworker]);
	module.socket(meta, socket, check(client) => true);
	module.input([flowstreamid], [id], data);
	module.trigger(flowstreamid, id, data);
	module.refresh([flowstreamid], [type]);

	Methods:
	instance.trigger(id, data);
	instance.destroy();
	instance.input([flowstreamid], [fromid], [toid], data);
	instance.add(id, body, [callback]);
	instance.rem(id, [callback]);
	instance.components(callback);
	instance.refresh([type]);
	instance.io(callback);
	instance.ioread(flowstreamid, id, callback);
	instance.reconfigure(id, config);
	instance.variables(variables);
	instance.variables2(variables);
	instance.pause(is);
	instance.socket(socket);
	instance.sendfs(flowstreamid, id, data);
	instance.exec(opt, callback);
	instance.httprequest(opt, callback);
	instance.eval(msg, callback);

	Delegates:
	instance.onsave(data);
	instance.ondone();
	instance.onerror(err, type, instanceid);
	instance.output(fid, data, tfsid, tid);
	instance.onhttproute(url, remove);
	instance.ondestroy();

	Extended Flow instances by:
	instance.save();
	instance.toinput(data, [flowstreamid], [id]);
	instance.output(data, [flowstreamid], [id]);
	instance.reconfigure(config);
	instance.newflowstream(meta, isworker);
	instance.input = function(data) {}
*/

function Instance(instance, id) {
	this.httproutes = {};
	this.version = VERSION;
	this.id = id;
	this.flow = instance;
}

Instance.prototype.httprequest = function(opt, callback) {

	// opt.route {String} a URL address
	// opt.params {Object}
	// opt.query {Object}
	// opt.body {Object}
	// opt.headers {Object}
	// opt.files {Array Object}
	// opt.url {String}
	// opt.callback {Function(err, meta)}

	if (opt.callback) {
		callback = opt.callback;
		opt.callback = undefined;
	}

	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callbackid !== -1)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/httprequest', data: opt, callbackid: callbackid });
	} else
		httprequest(self.flow, opt, callback);

	return self;
};

// Can't be used in the FlowStream component
Instance.prototype.httprouting = function() {

	var instance = this;

	instance.onhttproute = function(url, remove) {

		// GET / #upload #5000 #10000
		// - #flag means a flag name
		// - first #number is timeout
		// - second #number is max. limit for the payload

		var flags = [];
		var limit = 0;
		var timeout = 0;
		var id = url;

		url = url.replace(/#[a-z0-9]+/g, function(text) {
			text = text.substring(1);
			if ((/^\d+$/).test(text)) {
				if (timeout)
					limit = +text;
				else
					timeout = +text;
			} else
				flags.push(text);
			return '';
		}).trim();

		var route;

		if (remove) {
			route = instance.httproutes[id];
			if (route) {
				route.remove();
				delete instance.httproutes[id];
			}
			return;
		}

		if (instance.httproutes[id])
			instance.httproutes[id].remove();

		if (timeout)
			flags.push(timeout);

		route = ROUTE(url, function() {

			var self = this;
			var opt = {};

			opt.route = id;
			opt.params = self.params;
			opt.query = self.query;
			opt.body = self.body;
			opt.files = self.files;
			opt.headers = self.headers;
			opt.url = self.url;
			opt.ip = self.ip;
			opt.cookies = {};

			var cookie = self.headers.cookie;
			if (cookie) {
				var arr = cookie.split(';');
				for (var i = 0; i < arr.length; i++) {
					var line = arr[i].trim();
					var index = line.indexOf('=');
					if (index !== -1) {
						try {
							opt.cookies[line.substring(0, index)] = decodeURIComponent(line.substring(index + 1));
						} catch (e) {}
					}
				}
			}

			instance.httprequest(opt, function(meta) {

				if (meta.status)
					self.status = meta.status;

				if (meta.headers) {
					for (var key in meta.headers)
						self.header(key, meta.headers[key]);
				}

				if (meta.cookies && meta.cookies instanceof Array) {
					for (var item of meta.cookies) {
						var name = item.name || item.id;
						var value = item.value;
						var expiration = item.expiration || item.expires || item.expire;
						if (name && value && expiration)
							self.res.cookie(name, value, expiration, item.options || item.config);
					}
				}

				var data = meta.body || meta.data || meta.payload;
				switch (meta.type) {
					case 'error':
						self.invalid(meta.body);
						break;
					case 'text':
					case 'plain':
						self.plain(data);
						break;
					case 'html':
						self.content(data, 'text/html');
						break;
					case 'xml':
						self.content(data, 'text/xml');
						break;
					case 'json':
						self.json(data);
						break;
					case 'empty':
						self.empty();
						break;
					default:
						if (meta.filename) {
							var stream = F.Fs.createReadStream(meta.filename);
							self.stream(stream, meta.type, meta.download);
							meta.remove && CLEANUP(stream, () => F.Fs.unlink(meta.filename, NOOP));
						} else {
							if (typeof(data) === 'string')
								self.binary(Buffer.from(data, 'base64'), meta.type);
							else
								self.json(data);
						}
						break;
				}

			}, flags, limit);
		});

		instance.httproutes[id] = route;
	};

	return instance;
};

Instance.prototype.exec = function(opt, callback) {

	// opt.id = instance_ID
	// opt.callback = function(err, msg)
	// opt.uid = String/Number;             --> returned back
	// opt.ref = String/Number;             --> returned back
	// opt.repo = {};                       --> returned back
	// opt.data = {};                       --> returned back
	// opt.vars = {};
	// opt.timeout = Number;

	if (callback && !opt.callback)
		opt.callback = callback;

	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = opt.callback ? (CALLBACKID++) : -1;
		if (callbackid !== -1)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: opt.callback };
		self.flow.postMessage2({ TYPE: 'stream/exec', id: opt.id, uid: opt.uid, ref: opt.ref, vars: opt.vars, repo: opt.repo, data: opt.data, timeout: opt.timeout, callbackid: callbackid });
	} else
		exec(self.flow, opt);

	return self;
};

// Performs trigger
Instance.prototype.trigger = function(id, data) {
	var self = this;
	var flow = self.flow;
	if (flow.isworkerthread)
		flow.postMessage2({ TYPE: 'stream/trigger', id: id, data: data });
	else {
		if (!flow.paused) {
			if (id[0] === '@') {
				id = id.substring(1);
				for (var key in flow.meta.flow) {
					var com = flow.meta.flow[key];
					if (com.component === id && com.trigger)
						com.trigger(data);
				}
			} else if (id[0] === '#') {
				id = id.substring(1);
				for (var key in flow.meta.flow) {
					var com = flow.meta.flow[key];
					if (com.module.name === id && com.trigger)
						com.trigger(data);
				}
			} else {
				var com = flow.meta.flow[id];
				if (com && com.trigger)
					com.trigger(data);
			}
		}
	}
	return self;
};

// Performs pause
Instance.prototype.pause = function(is) {
	var self = this;
	var flow = self.flow;
	if (flow.isworkerthread)
		flow.postMessage2({ TYPE: 'stream/pause', is: is });
	else
		flow.pause(is == null ? !flow.paused : is);
	return self;
};

// Asssigns UI websocket the the FlowStream
Instance.prototype.socket = function(socket) {
	var self = this;
	exports.socket(self.flow, socket);
	return self;
};

Instance.prototype.eval = function(msg, callback) {
	var self = this;
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callback)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'ui/message', data: msg, callbackid: callbackid });
	} else
		self.flow.proxy.message(msg, -1, callback);
	return self;
};

// Destroys the Flow
Instance.prototype.kill = Instance.prototype.destroy = function() {

	var self = this;

	setTimeout(() => exports.refresh(self.id, 'destroy'), 500);
	self.flow.$destroyed = true;

	if (self.flow.isworkerthread) {
		self.flow.$socket && self.flow.$socket.destroy();
		if (self.flow.terminate)
			self.flow.terminate();
		else
			self.flow.kill(9);
	} else {
		if (self.flow.sockets) {
			for (var key in self.flow.sockets)
				self.flow.sockets[key].destroy();
		}
		self.flow.$socket && self.flow.$socket.destroy();
		self.flow.destroy();
	}

	for (var key in CALLBACKS) {
		if (CALLBACKS[key].id === self.id)
			delete CALLBACKS[key];
	}

	if (self.httproutes) {
		for (var key in self.httproutes)
			self.httproutes[key].remove();
	}

	self.ondestroy && self.ondestroy();
	delete FLOWS[self.id];
};

// Sends data to the speficic input
// "@id" sends to all component with "id"
// "id" sends to instance with "id"
Instance.prototype.input = function(flowstreamid, fromid, toid, data) {

	var self = this;
	var flow = self.flow;

	if (flow.isworkerthread) {
		flow.postMessage2({ TYPE: 'stream/input', flowstreamid: flowstreamid, fromid: fromid, id: toid, data: data });
		return self;
	}

	if (toid) {
		if (toid[0] === '@') {
			var tmpid = toid.substring(1);
			for (var key in flow.meta.flow) {
				let tmp = flow.meta.flow[key];
				if (tmp.input && tmp.component === tmpid)
					tmp.input(flowstreamid, fromid, data);
			}
		} else {
			let tmp = flow.meta.flow[toid];
			if (tmp.input)
				tmp.input(flowstreamid, fromid, data);
		}
	} else {
		// Send to all inputs
		for (var key in flow.meta.flow) {
			var f = flow.meta.flow[key];
			var c = flow.meta.components[f.component];
			if (f.input && c.type === 'input2')
				f.input(flowstreamid, fromid, data);
		}
	}

	return self;
};

// Adds a new component
Instance.prototype.add = function(id, body, callback) {
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callback)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/add', id: id, data: body, callbackid: callbackid });
	} else
		self.flow.add(id, body, callback);
	return self;
};

// Removes specific component
Instance.prototype.rem = function(id, callback) {
	if (self.flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		if (callback)
			CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/rem', id: id, callbackid: callbackid });
	} else
		self.flow.unregister(id, callback);
	return self;
};

// Reads all components
Instance.prototype.components = function(callback) {

	var self = this;

	if (self.flow.isworkerthread) {
		var callbackid = CALLBACKID++;
		CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/components', callbackid: callbackid });
	} else
		callback(null, self.flow.components(true));

	return self;
};

function readmeta(meta) {
	var obj = {};
	obj.id = meta.id;
	obj.name = meta.name;
	obj.version = meta.version;
	obj.icon = meta.icon;
	obj.color = meta.color;
	obj.reference = meta.reference;
	obj.group = meta.group;
	obj.author = meta.author;
	return obj;
}

function readinstance(flow, id) {
	var tmp = flow.meta.flow[id];
	if (tmp) {
		var com = flow.meta.components[tmp.component];
		if (com) {
			if ((com.type === 'output' || com.type === 'input' || com.type === 'config'))
				return { id: id, componentid: tmp.component, component: com.name, name: tmp.config.name || com.name, schema: com.schemaid ? com.schemaid[1] : undefined, icon: com.icon, type: com.type, readme: tmp.config.readme, outputs: tmp.outputs, inputs: tmp.inputs };
		} else
			flow.clean();
	}
}

// Reads all inputs, outputs, publish, subscribe instances
Instance.prototype.io = function(id, callback) {

	var self = this;

	if (self.flow.isworkerthread) {
		var callbackid = CALLBACKID++;
		CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/io', id: id, callbackid: callbackid });
		return self;
	}

	var flow = self.flow;

	if (id) {
		var obj = null;
		if (flow.meta.flow[id])
			callback(null, readinstance(flow, id));
		else
			callback();
		return;
	}

	var arr = [];

	for (var key in flow.meta.flow) {
		var obj = readinstance(flow, key);
		obj && arr.push(obj);
	}

	callback(null, arr);
};

// Reconfigures a component
Instance.prototype.reconfigure = function(id, config) {
	if (self.flow.isworkerthread)
		self.flow.postMessage2({ TYPE: 'stream/reconfigure', id: id, data: config });
	else
		self.flow.reconfigure(id, config);
	return self;
};

Instance.prototype.refresh = function(id, type, data) {
	var self = this;
	var flow = self.flow;
	if (flow.isworkerthread) {
		flow.postMessage2({ TYPE: 'stream/refresh', id: id, type: type, data: data });
	} else {

		if (type === 'meta' && data) {
			for (var key in data)
				flow.$schema[key] = data[key];
			flow.proxy.refreshmeta();
		}

		for (var key in flow.meta.flow) {
			var instance = flow.meta.flow[key];
			instance.flowstream && instance.flowstream(id, type);
		}
	}
};

// Updates variables
Instance.prototype.variables = function(variables) {

	var self = this;
	var flow = self.flow;

	if (flow.isworkerthread) {
		flow.$schema.variables = variables;
		flow.postMessage2({ TYPE: 'stream/variables', data: variables });
	} else {
		flow.variables = variables;
		for (var key in flow.meta.flow) {
			var instance = flow.meta.flow[key];
			instance.variables && instance.variables(flow.variables);
		}
		flow.proxy.online && flow.proxy.send({ TYPE: 'flow/variables', data: variables });
		flow.save();
	}
	return self;
};

// Updates global variables
Instance.prototype.variables2 = function(variables) {

	var self = this;
	var flow = self.flow;

	if (flow.isworkerthread) {
		flow.$schema.variables2 = variables;
		flow.postMessage2({ TYPE: 'stream/variables2', data: variables });
	} else {
		flow.variables2 = variables;
		for (var key in flow.meta.flow) {
			var instance = flow.meta.flow[key];
			instance.variables2 && instance.variables2(flow.variables2);
		}
		flow.save();
	}
	return self;
};

Instance.prototype.export = function(callback) {
	var self = this;
	var flow = self.flow;
	if (flow.isworkerthread) {
		var callbackid = callback ? (CALLBACKID++) : -1;
		CALLBACKS[callbackid] = { id: self.flow.id, callback: callback };
		self.flow.postMessage2({ TYPE: 'stream/export', callbackid: callbackid });
	} else
		callback(null, self.flow.export2());
	return self;
};

// Initializes FlowStream
exports.init = function(meta, isworker, callback) {
	return isworker ? init_worker(meta, isworker, callback) : init_current(meta, callback);
};

exports.exec = function(id, opt) {
	var fs = FLOWS[id];
	if (fs)
		fs.exec(id, opt);
	else if (opt.callback)
		opt.callback(404);
};

exports.eval = function(id, opt) {
	var fs = FLOWS[id];
	if (fs)
		fs.eval(id, opt);
	else if (opt.callback)
		opt.callback(404);
};

exports.input = function(ffsid, fid, tfsid, tid, data) {
	if (tfsid) {
		var fs = FLOWS[tfsid];
		fs && fs.$instance.input(ffsid, fid, tid, data);
	} else {
		for (var key in FLOWS) {
			var flow = FLOWS[key];
			flow.$instance.input(ffsid, fid, tid, data);
		}
	}
};

exports.trigger = function(flowstreamid, id, data) {
	var fs = FLOWS[flowstreamid];
	fs && fs.trigger(id, data);
};

exports.refresh = function(id, type) {
	for (var key in FLOWS) {
		var flow = FLOWS[key];
		flow.$instance.refresh(id, type);
	}
};

exports.version = VERSION;

function exec(self, opt) {

	var target = [];
	var instances = self.meta.flow;
	var id;

	if (opt.id[0] === '@') {
		id = opt.id.substring(1);
		for (var key in instances) {
			if (instances[key].component === id)
				target.push(instances[key]);
		}
	} else if (opt.id[0] === '#') {
		id = opt.id.substring(1);
		for (var key in instances) {
			if (instances[key].module.name === id)
				target.push(instances[key]);
		}
	} else {
		if (instances[opt.id])
			target.push(instances[opt.id]);
	}

	target.wait(function(instance, next) {
		var msg = instance && instance.message ? instance.newmessage() : null;
		if (msg) {

			if (opt.vars)
				msg.vars = opt.vars;

			if (opt.repo)
				msg.repo = opt.repo;

			msg.data = opt.data == null ? {} : opt.data;

			if (opt.callbackid !== -1) {
				msg.on('end', function(msg) {

					var output = {};
					output.uid = opt.uid;
					output.ref = opt.ref;
					output.error = msg.error;
					output.repo = msg.repo;
					output.data = msg.data;
					output.count = msg.count;
					output.cloned = msg.cloned;
					output.duration = Date.now() - msg.duration;
					output.meta = { id: instance.id, component: instance.component };

					if (Parent) {
						if (opt.callbackid !== -1) {
							opt.repo = undefined;
							opt.vars = undefined;
							opt.data = output;
							Parent.postMessage(opt);
						}
					} else if (opt.callback)
						opt.callback(output.error, output);
				});
			}

			if (opt.timeout)
				msg.totaltimeout(opt.timeout);

			instance.message(msg);

		} else if (opt.callback) {
			opt.callback(404);
		} else if (Parent && opt.callbackid !== -1) {
			opt.repo = undefined;
			opt.vars = undefined;
			opt.data = { error: 404 };
			Parent.postMessage(opt);
		}

		setImmediate(next);
	});
}

function httprequest(self, opt, callback) {
	if (self.httproutes[opt.route]) {
		self.httproutes[opt.route].callback(opt, function(data) {
			// data.status {Number}
			// data.headers {Object}
			// data.body {Buffer}
			if (Parent)
				Parent.postMessage({ TYPE: 'stream/httpresponse', data: data, callbackid: callback });
			else
				callback(data);
		});
	} else {
		if (Parent)
			Parent.postMessage({ TYPE: 'stream/httpresponse', data: { type: 'error', body: 404 }, callbackid: callback });
		else
			callback({ type: 'error', body: 404 });
	}
}

function init_current(meta, callback) {

	if (!meta.directory)
		meta.directory = PATH.root('flowstream');

	// Due to C/C++ modules
	if (W.workerData || meta.sandbox)
		CONF.node_modules = '~' + PATH.join(meta.directory, meta.id, 'node_modules');

	var flow = MAKEFLOWSTREAM(meta);
	FLOWS[meta.id] = flow;

	if (isFLOWSTREAMWORKER && meta.unixsocket && meta.proxypath && F.frameworkless) {
		if (!F.isWindows)
			F.Fs.unlink(meta.unixsocket, NOOP);
		F.frameworkless(false, { unixsocket: meta.unixsocket, config: { allow_stats_snapshot: false }});
	}

	flow.env = meta.env;
	flow.origin = meta.origin;
	flow.proxypath = meta.proxypath || '';
	flow.proxy.online = false;

	flow.$instance = new Instance(flow, meta.id);

	flow.$instance.output = function(fid, data, tfsid, tid) {
		exports.input(meta.id, fid, tfsid, tid, data);
	};

	if (Parent) {

		Parent.on('message', function(msg) {

			switch (msg.TYPE) {

				case 'stream/export':
					msg.data = flow.export2();
					Parent.postMessage(msg);
					break;

				case 'stream/reconfigure':
					flow.reconfigure(msg.id, msg.data);
					break;

				case 'stream/httprequest':
					httprequest(flow, msg.data, msg.callbackid);
					break;

				case 'stream/exec':
					exec(flow, msg);
					break;

				case 'stream/eval':
					if (msg.callbackid) {
						flow.proxy.message(msg, function(response) {
							msg.data = response;
							Parent.postMessage(msg);
						});
					} else
						flow.proxy.message(msg);
					break;

				case 'stream/trigger':
					if (!flow.paused) {
						var tmp = flow.meta.flow[meta.id];
						if (tmp && tmp.trigger)
							tmp.trigger(msg.data);
					}
					break;

				case 'stream/pause':
					flow.pause(msg.is == null ? !flow.paused : msg.is);
					flow.save();
					break;

				case 'stream/refresh':

					if (msg.type === 'meta' && msg.data) {
						for (var key in msg.data)
							flow.$schema[key] = msg.data[key];
						flow.proxy.refreshmeta();
					}

					for (var key in flow.meta.flow) {
						var instance = flow.meta.flow[key];
						instance.flowstream && instance.flowstream(msg.id, msg.type);
					}
					break;

				case 'stream/io2':
					var cb = CALLBACKS[msg.callbackid];
					if (cb) {
						delete CALLBACKS[msg.callbackid];
						cb.callback(msg.error, msg.data);
					}
					break;

				case 'stream/components':
					msg.data = flow.components(true);
					Parent.postMessage(msg);
					break;

				case 'stream/io':

					if (msg.id) {
						msg.data = readinstance(flow, msg.id);
					} else {
						var arr = [];
						for (var key in flow.meta.flow) {
							let tmp = readinstance(flow, key);
							if (tmp)
								arr.push(tmp);
						}
						msg.data = arr;
					}

					Parent.postMessage(msg);
					break;

				case 'stream/input':

					if (msg.id) {
						if (msg.id[0] === '@') {
							var id = msg.id.substring(1);
							for (var key in flow.meta.flow) {
								let tmp = flow.meta.flow[key];
								if (tmp.input && tmp.component === id)
									tmp.input(msg.flowstreamid, msg.fromid, msg.data);
							}
						} else {
							let tmp = flow.meta.flow[msg.id];
							if (tmp && tmp.input)
								tmp.input(msg.flowstreamid, msg.fromid, msg.data);
						}
					} else {
						for (var key in flow.meta.flow) {
							var f = flow.meta.flow[key];
							var c = flow.meta.components[f.component];
							if (f.input && c.type === 'input2')
								f.input(msg.flowstreamid, msg.fromid, msg.data);
						}
					}
					break;

				case 'stream/add':
					flow.add(msg.id, msg.data, function(err) {
						msg.error = err ? err.toString() : null;
						if (msg.callbackid !== -1)
							Parent.postMessage(msg);
						flow.save();
					});
					break;

				case 'stream/rem':
					flow.unregister(msg.id, function(err) {
						msg.error = err ? err.toString() : null;
						if (msg.callbackid !== -1)
							Parent.postMessage(msg);
						flow.save();
					});
					break;

				case 'stream/variables':
					flow.variables = msg.data;
					for (var key in flow.meta.flow) {
						var instance = flow.meta.flow[key];
						instance.variables && instance.variables(flow.variables);
					}
					flow.proxy.online && flow.proxy.send({ TYPE: 'flow/variables', data: msg.data });
					flow.save();
					break;

				case 'stream/variables2':
					flow.variables2 = msg.data;
					for (var key in flow.meta.flow) {
						var instance = flow.meta.flow[key];
						instance.variables2 && instance.variables2(flow.variables2);
					}
					flow.save();
					break;

				case 'ui/newclient':
					flow.proxy.online = true;
					flow.proxy.newclient(msg.clientid);
					break;

				case 'ui/online':
					flow.proxy.online = msg.online;
					break;

				case 'ui/message':
					if (msg.callbackid) {
						flow.proxy.message(msg.data, msg.clientid, function(data) {
							msg.TYPE = 'stream/eval';
							msg.data = data;
							Parent.postMessage(msg);
						});
					} else
						flow.proxy.message(msg.data, msg.clientid);
					break;
			}
		});

		flow.proxy.kill = function() {
			Parent.postMessage({ TYPE: 'stream/kill' });
		};

		flow.proxy.send = function(msg, type, clientid) {
			Parent.postMessage({ TYPE: 'ui/send', data: msg, type: type, clientid: clientid });
		};

		flow.proxy.save = function(data) {
			if (!flow.$schema || !flow.$schema.readonly)
				Parent.postMessage({ TYPE: 'stream/save', data: data });
		};

		flow.proxy.httproute = function(url, callback, instance) {
			if (!flow.$schema || !flow.$schema.readonly) {
				if (callback)
					flow.httproutes[url] = { id: instance.id, component: instance.component, callback: callback };
				else
					delete flow.httproutes[url];
				Parent.postMessage({ TYPE: 'stream/httproute', data: { url: url, remove: callback == null }});
			}
		};

		flow.proxy.done = function(err) {
			Parent.postMessage({ TYPE: 'stream/done', error: err });
		};

		flow.proxy.error = function(err, source, instance) {

			var instanceid = '';
			var componentid = '';

			if (instance) {
				if (source === 'instance_message') {
					if (instance.instance) {
						instanceid = instance.instance.id;
						componentid = instance.instance.component;
					} else
						console.log('ERROR', instance);
				} else if (source === 'instance_close') {
					instanceid = instance.id;
					componentid = instance.component;
				} else if (source === 'instance_make') {
					instanceid = instance.id;
					componentid = instance.component;
				} else if (source === 'register') {
					instanceid = '';
					componentid = instance;
				}
			}

			instanceid && flow.onerror(err, source, instanceid, componentid);
			Parent.postMessage({ TYPE: 'stream/error', error: err.toString(), stack: err.stack, source: source, id: instanceid, component: componentid });
		};

		flow.proxy.refresh = function(type) {
			Parent.postMessage({ TYPE: 'stream/refresh', type: type });
		};

		flow.proxy.output = function(id, data, flowstreamid, instanceid) {
			Parent.postMessage({ TYPE: 'stream/output', id: id, data: data, flowstreamid: flowstreamid, instanceid: instanceid });
		};

		flow.proxy.input = function(fromid, tfsid, toid, data) {
			Parent.postMessage({ TYPE: 'stream/toinput', fromflowstreamid: flow.id, fromid: fromid, toflowstreamid: tfsid, toid: toid, data: data });
		};

		flow.proxy.restart = function() {
			Parent.postMessage({ TYPE: 'stream/restart' });
		};

		flow.proxy.io = function(flowstreamid, id, callback) {

			if (typeof(flowstreamid) === 'function') {
				callback = flowstreamid;
				id = null;
				flowstreamid = null;
			} else if (typeof(id) === 'function') {
				callback = id;
				id = null;
			}

			var callbackid = callback ? (CALLBACKID++) : -1;
			if (callback)
				CALLBACKS[callbackid] = { id: flow.id, callback: callback };

			Parent.postMessage({ TYPE: 'stream/io2', flowstreamid: flowstreamid, id: id, callbackid: callbackid });
		};

	} else {

		flow.proxy.io = function(flowstreamid, id, callback) {
			exports.io(flowstreamid, id, callback);
		};

		flow.proxy.restart = function() {
			// nothing
		};

		flow.proxy.kill = function() {
			flow.$instance.kill();
		};

		flow.proxy.send = NOOP;
		flow.proxy.save = function(data) {
			if (!flow.$schema || !flow.$schema.readonly)
				flow.$instance.onsave && flow.$instance.onsave(data);
		};

		flow.proxy.httproute = function(url, callback, instanceid) {
			if (!flow.$schema || !flow.$schema.readonly) {
				if (callback)
					flow.httproutes[url] = { id: instanceid, callback: callback };
				else
					delete flow.httproutes[url];
				flow.$instance.onhttproute && flow.$instance.onhttproute(url, callback == null);
			}
		};

		flow.proxy.refresh = function(type) {
			exports.refresh(flow.id, type);
		};

		flow.proxy.done = function(err) {
			flow.$instance.ondone && setImmediate(flow.$instance.ondone, err);
		};

		flow.proxy.input = function(fromid, tfsid, toid, data) {
			exports.input(flow.id, fromid, tfsid, toid, data);
		};

		flow.proxy.error = function(err, source, instance) {

			var instanceid = '';
			var componentid = '';

			if (instance) {
				if (source === 'instance_message') {
					instanceid = instance.instance.id;
					componentid = instance.instance.component;
				} else if (source === 'instance_close') {
					instanceid = instance.id;
					componentid = instance.component;
				} else if (source === 'instance_make') {
					instanceid = instance.id;
					componentid = instance.component;
				} else if (source === 'register') {
					instanceid = '';
					componentid = instance;
				}
			}

			instanceid && flow.onerror(err, source, instanceid, componentid);
			flow.$instance.onerror && flow.$instance.onerror(err, source, instanceid, componentid);
		};

		flow.proxy.output = function(id, data, flowstreamid, instanceid) {
			flow.$instance.output && flow.$instance.output(id, data, flowstreamid, instanceid);
		};
	}

	callback && callback(null, flow.$instance);
	return flow.$instance;
}

function init_worker(meta, type, callback) {

	var forkargs = [F.directory, '--fork'];

	if (meta.memory)
		forkargs.push('--max-old-space-size=' + meta.memory);

	var worker = type === true || type === 'worker' ? (new W.Worker(__filename, { workerData: meta })) : Fork(__filename, forkargs, { serialization: 'json' });
	var ischild = false;

	meta.unixsocket = F.isWindows ? ('\\\\?\\pipe\\flowstream' + F.directory.makeid() + meta.id + Date.now().toString(36)) : (F.Path.join(F.OS.tmpdir(), 'flowstream_' + F.directory.makeid() + '_' + meta.id + '_' + Date.now().toString(36) + '.socket'));

	if (!worker.postMessage) {
		worker.postMessage = worker.send;
		ischild = true;
	}

	worker.postMessage2 = function(a, b) {
		if (!worker.$terminated)
			worker.postMessage(a, b);
	};

	worker.$instance = new Instance(worker, meta.id);
	worker.$instance.isworkerthread = true;
	worker.isworkerthread = true;
	worker.$schema = meta;

	worker.$instance.output = function(id, data, flowstreamid, instanceid) {
		exports.input(meta.id, id, flowstreamid, instanceid, data);
	};

	FLOWS[meta.id] = worker;

	var restart = function(code) {
		worker.$terminated = true;
		setTimeout(function(worker, code) {
			worker.$socket && setTimeout(socket => socket && socket.destroy(), 2000, worker.$socket);
			if (!worker.$destroyed) {
				console.log('FlowStream auto-restart: ' + worker.$schema.name + ' (exit code: ' + ((code || '0') + '') + ')');
				init_worker(worker.$schema, type, callback);
				worker.$instance = null;
				worker.$schema = null;
				worker.$destroyed = true;
			}
		}, 1000, worker, code);
	};

	worker.on('exit', restart);

	worker.on('message', function(msg) {
		switch (msg.TYPE) {

			case 'stream/stats':
				worker.stats = msg.data;
				break;

			case 'stream/restart':
				if (worker.terminate)
					worker.terminate();
				else
					worker.kill(9);
				break;

			case 'stream/kill':
				if (!worker.$terminated)
					worker.$instance.destroy(msg.code || 9);
				break;

			case 'stream/exec':
				var cb = CALLBACKS[msg.callbackid];
				if (cb) {
					delete CALLBACKS[msg.callbackid];
					cb.callback(msg.data.error, msg.data, msg.meta);
				}
				break;

			case 'stream/httpresponse':
				var cb = CALLBACKS[msg.callbackid];
				if (cb) {
					delete CALLBACKS[msg.callbackid];
					cb.callback(msg.data, msg.meta);
				}
				break;

			case 'stream/export':
			case 'stream/components':
				var cb = CALLBACKS[msg.callbackid];
				if (cb) {
					delete CALLBACKS[msg.callbackid];
					cb.callback(null, msg.data);
				}
				break;

			case 'stream/toinput':
				exports.input(msg.fromflowstreamid, msg.fromid, msg.toflowstreamid, msg.toid, msg.data);
				break;

			case 'stream/refresh':
				exports.refresh(meta.id, msg.type);
				break;

			case 'stream/error':
				worker.socket && worker.$socket.send({ TYPE: 'flow/error', error: msg.error, stack: msg.stack, source: msg.source, id: msg.id, component: msg.component });
				worker.$instance.onerror && worker.$instance.onerror(msg.error, msg.source, msg.id, msg.component, msg.stack);
				break;

			case 'stream/save':
				worker.$schema.components = msg.data.components;
				worker.$schema.design = msg.data.design;
				worker.$schema.variables = msg.data.variables;
				worker.$schema.origin = msg.data.origin;
				worker.$schema.sources = msg.data.sources;
				worker.$instance.onsave && worker.$instance.onsave(msg.data);
				break;

			case 'stream/httproute':
				worker.$instance.onhttproute && worker.$instance.onhttproute(msg.data.url, msg.data.remove);
				break;

			case 'stream/done':
				worker.$instance.ondone && worker.$instance.ondone(msg.error);
				break;

			case 'stream/io2':
				exports.io(msg.flowstreamid, msg.id, function(err, data) {
					msg.data = data;
					msg.error = err;
					worker.postMessage(msg);
				});
				break;

			case 'stream/output':
				worker.$instance.output && worker.$instance.output(msg.id, msg.data, msg.flowstreamid, msg.instanceid);
				break;

			case 'stream/add':
			case 'stream/rem':
				var cb = CALLBACKS[msg.callbackid];
				if (cb) {
					delete CALLBACKS[msg.callbackid];
					cb.callback(msg.error);
				}
				break;

			case 'stream/io':
			case 'stream/eval':
				var cb = CALLBACKS[msg.callbackid];
				if (cb) {
					delete CALLBACKS[msg.callbackid];
					cb.callback(msg.error, msg.data);
				}
				break;

			case 'ui/send':
				switch (msg.type) {
					case 1:
						worker.$socket && worker.$socket.send(msg.data, client => client.id === msg.clientid);
						break;
					case 2:
						worker.$socket && worker.$socket.send(msg.data, client => client.id !== msg.clientid);
						break;
					default:
						worker.$socket && worker.$socket.send(msg.data);
						break;
				}
				break;
		}

	});

	ischild && worker.send({ TYPE: 'init', data: meta });
	callback && callback(null, worker.$instance);
	return worker.$instance;
}

exports.io = function(flowstreamid, id, callback) {

	if (typeof(flowstreamid) === 'function') {
		callback = flowstreamid;
		id = null;
		flowstreamid = null;
	} else if (typeof(id) === 'function') {
		callback = id;
		id = null;
	}

	var flow;

	if (id) {
		flow = FLOWS[flowstreamid];

		if (flow) {
			flow.$instance.io(id, function(err, data) {
				if (data) {
					var tmp = readmeta(flow.$schema);
					tmp.item = data;
					data = tmp;
				}
				callback(err, data);
			});
		} else
			callback();

		return;
	}

	if (flowstreamid) {
		flow = FLOWS[flowstreamid];
		if (flow) {
			flow.$instance.io(null, function(err, data) {
				var f = flow.$schema || EMPTYOBJECT;
				var meta = readmeta(f);
				meta.items = data;
				callback(null, meta);
			});
		} else
			callback();
		return;
	}

	var arr = [];

	Object.keys(FLOWS).wait(function(key, next) {
		var flow = FLOWS[key];
		if (flow) {
			flow.$instance.io(null, function(err, data) {
				var f = flow.$schema || EMPTYOBJECT;
				var meta = readmeta(f);
				meta.items = data;
				arr.push(meta);
				next();
			});
		} else
			next();
	}, function() {
		callback(null, arr);
	});
};

exports.socket = function(flow, socket, check) {

	if (typeof(flow) === 'string')
		flow = FLOWS[flow];

	if (!flow) {
		setTimeout(() => socket.destroy(), 100);
		return;
	}

	flow.$socket = socket;

	var newclient = function(client) {

		client.isflowstreamready = true;

		if (flow.isworkerthread) {
			flow.postMessage2({ TYPE: 'ui/newclient', clientid: client.id });
		} else {
			flow.proxy.online = true;
			flow.proxy.newclient(client.id);
		}

	};

	socket.on('open', function(client) {
		if (check)
			check(client, () => newclient(client));
		else
			newclient(client);
	});

	socket.autodestroy(function() {

		delete flow.$socket;

		if (flow.isworkerthread)
			flow.postMessage2({ TYPE: 'ui/online', online: false });
		else
			flow.proxy.online = false;
	});

	socket.on('close', function(client) {
		if (client.isflowstreamready) {
			var is = socket.online > 0;
			if (flow.isworkerthread)
				flow.postMessage2({ TYPE: 'ui/online', online: is });
			else
				flow.proxy.online = is;
		}
	});

	socket.on('message', function(client, msg) {
		if (client.isflowstreamready) {
			if (flow.isworkerthread)
				flow.postMessage2({ TYPE: 'ui/message', clientid: client.id, data: msg });
			else
				flow.proxy.message(msg, client.id);
		}
	});

	if (flow.isworkerthread)
		return;

	flow.proxy.send = function(msg, type, clientid) {

		// 0: all
		// 1: client
		// 2: with except client

		switch (type) {
			case 1:
				clientid && socket.send(msg, conn => conn.id === clientid);
				break;
			case 2:
				socket.send(msg, conn => conn.id !== clientid);
				break;
			default:
				socket.send(msg);
				break;
		}
	};
};

function MAKEFLOWSTREAM(meta) {

	var flow = FLOWSTREAM(meta.id, function(err, type, instance) {
		flow.proxy.error(err, type, instance);
	});

	var saveid;

	flow.metadata = meta;
	flow.export_instance2 = function(id) {

		var com = flow.meta.flow[id];
		if (com) {

			if (id === 'paused' || id === 'groups' || id === 'tabs')
				return CLONE(com);

			var tmp = {};
			tmp.id = id;
			tmp.config = CLONE(com.config);
			tmp.x = com.x;
			tmp.y = com.y;
			tmp.offset = com.offset;
			tmp.size = com.size;
			tmp.meta = com.meta;
			tmp.schemaid = com.schemaid;
			tmp.note = com.note;
			tmp.schema = com.schema;
			tmp.component = com.component;
			tmp.connections = CLONE(com.connections);
			tmp.tab = com.tab;

			if (com.outputs)
				tmp.outputs = com.outputs;

			if (com.inputs)
				tmp.inputs = com.inputs;

			var c = flow.meta.components[com.component];
			if (c) {
				tmp.template = { type: c.type, icon: c.icon, group: c.group, name: c.name, inputs: c.inputs, outputs: c.outputs };
				return tmp;
			}
		}
	};

	flow.export2 = function() {

		var variables = flow.variables;
		var design = {};
		var components = {};
		var sources = {};

		for (var key in flow.sources) {
			var com = flow.sources[key];
			sources[key] = com;
		}

		for (var key in flow.meta.components) {
			var com = flow.meta.components[key];
			components[key] = com.ui.raw;
		}

		for (var key in flow.meta.flow)
			design[key] = flow.export_instance2(key);

		var data = {};
		data.paused = flow.paused;
		data.id = flow.$schema.id;
		data.reference = flow.$schema.reference;
		data.author = flow.$schema.author;
		data.group = flow.$schema.group;
		data.icon = flow.$schema.icon;
		data.color = flow.$schema.color;
		data.version = flow.$schema.version;
		data.readme = flow.$schema.readme;
		data.url = flow.$schema.url;
		data.name = flow.$schema.name;
		data.components = components;
		data.design = design;
		data.variables = variables;
		data.sources = sources;
		data.proxypath = flow.$schema.proxypath;
		data.origin = flow.$schema.origin;
		data.dtcreated = flow.$schema.dtcreated;
		return data;
	};

	var save_force = function() {
		saveid && clearTimeout(saveid);
		saveid = null;
		flow.proxy.save(flow.export2());
	};

	var save = function() {

		// reloads TMS
		for (var key in flow.sockets)
			flow.sockets[key].synchronize();

		if (flow.$schema && flow.$schema.readonly)
			return;

		clearTimeout(saveid);
		saveid = setTimeout(save_force, 5000);
	};

	flow.save = function() {
		save();
	};

	flow.kill = function(code) {
		flow.proxy.kill(code);
	};

	flow.restart = function() {
		flow.proxy.restart();
	};

	var timeoutrefresh = null;

	var refresh_components_force = function() {
		timeoutrefresh = null;
		if (flow.proxy.online) {
			flow.proxy.send({ TYPE: 'flow/components', data: flow.components(true) });
			var instances = flow.export();
			flow.proxy.send({ TYPE: 'flow/design', data: instances });
		}
	};

	var refresh_components = function() {
		timeoutrefresh && clearTimeout(timeoutrefresh);
		timeoutrefresh = setTimeout(refresh_components_force, 700);
	};

	flow.sources = meta.sources;
	flow.proxy = {};

	flow.proxy.variables = function(data) {
		flow.variables = data;
		for (var key in flow.meta.flow) {
			var instance = flow.meta.flow[key];
			instance.variables && instance.variables(flow.variables);
		}
		var msg = {};
		msg.TYPE = 'flow/variables';
		msg.data = data;
		flow.proxy.online && flow.proxy.send(msg);
		save();
	};

	flow.proxy.message = function(msg, clientid, callback) {
		switch (msg.TYPE) {

			case 'call':

				var instance;

				// Executes "exports.call"
				if (msg.id[0] === '@') {
					instance = flow.meta.components[msg.id.substring(1)];
					if (instance && instance.call) {
						msg.id = msg.callbackid;
						msg.TYPE = 'flow/call';
						instance.call.call(flow, msg.data, function(data) {
							msg.data = data;
							flow.proxy.online && flow.proxy.send(msg, 1, clientid);
							callback && callback(msg);
						});
					}
					return;
				}

				instance = flow.meta.flow[msg.id];
				if (instance && instance.call) {
					msg.id = msg.callbackid;
					msg.TYPE = 'flow/call';
					instance.call(msg.data, function(data) {
						msg.data = data;
						flow.proxy.online && flow.proxy.send(msg, 1, clientid);
						callback && callback(msg);
					});
				}
				break;

			case 'note':
			case 'meta':
				var instance = flow.meta.flow[msg.id];
				if (instance) {
					instance[msg.TYPE] = msg.data;
					msg.TYPE = 'flow/' + msg.TYPE;
					flow.proxy.online && flow.proxy.send(msg, 0, clientid);
					callback && callback(msg);
					save();
				}
				break;

			case 'status':
				flow.instances().wait(function(com, next) {
					com[msg.TYPE] && com[msg.TYPE](msg, 0, clientid);
					setImmediate(next);
				}, 3);
				break;

			case 'refresh':
				// Sends last statuses
				flow.instances().wait(function(com, next) {
					com.status();
					setImmediate(next);
				}, 3);
				break;

			case 'reset':
				flow.errors.length = 0;
				msg.TYPE = 'flow/reset';
				flow.proxy.online && flow.proxy.send(msg, 0, clientid);
				callback && callback(msg);
				break;

			case 'trigger':
				var instance = flow.meta.flow[msg.id];
				instance && instance.trigger && instance.trigger(msg);
				break;

			case 'config':
				var instance = flow.meta.flow[msg.id];
				if (instance) {
					msg.TYPE = 'flow/configuration';
					msg.data = instance.config;
					flow.proxy.send(msg, 1, clientid);
				}
				break;

			case 'reconfigure':
				flow.reconfigure(msg.id, msg.data);
				break;

			case 'move':
				var com = flow.meta.flow[msg.id];
				if (com) {
					com.x = msg.data.x;
					com.y = msg.data.y;
					msg.TYPE = 'flow/move';
					flow.proxy.online && flow.proxy.send(msg, 2, clientid);
					callback && callback(msg);
					save();
				}
				break;

			case 'groups':
				flow.meta.flow.groups = msg.data;
				msg.TYPE = 'flow/groups';
				flow.proxy.online && flow.proxy.send(msg, 2, clientid);
				callback && callback(msg);
				save();
				break;

			case 'export':
				msg.TYPE = 'flow/export';
				if (flow.proxy.online) {
					msg.data = flow.export2();
					if (isFLOWSTREAMWORKER)
						msg.data.worker = process.argv.indexOf('--fork') === -1 ? 'worker' : 'fork';
					flow.proxy.send(msg, 1, clientid);
					callback && callback(msg);
				}
				break;

			case 'origin':
				var origin = msg.body || '';
				if (flow.$schema.origin !== origin) {
					flow.origin = flow.$schema.origin = origin;
					save();
				}
				break;

			case 'restart':
				flow.proxy.restart();
				break;

			case 'reset_stats':
				flow.stats.messages = 0;
				flow.stats.pending = 0;
				break;

			case 'save':
				flow.use(CLONE(msg.data), function(err) {
					msg.error = err ? err.toString() : null;
					msg.TYPE = 'flow/design';
					flow.proxy.online && flow.proxy.send(msg);
					callback && callback(msg);
					save();
				});
				break;

			case 'insert':
				flow.insert(CLONE(msg.data), function(err) {
					for (var key in msg.data)
						msg.data[key] = flow.export_instance2(key);
					msg.TYPE = 'flow/design_insert';
					msg.error = err ? err.toString() : null;
					flow.proxy.online && flow.proxy.send(msg);
					callback && callback(msg);
					save();
				});
				break;

			case 'remove':
				flow.remove(msg.data, function(err) {
					msg.TYPE = 'flow/design_remove';
					msg.error = err ? err.toString() : null;
					flow.proxy.online && flow.proxy.send(msg);
					callback && callback(msg);
					save();
				});
				break;

			case 'variables':
				flow.variables = msg.data;
				for (var key in flow.meta.flow) {
					var instance = flow.meta.flow[key];
					instance.variables && instance.variables(flow.variables);
				}
				msg.TYPE = 'flow/variables';
				flow.proxy.online && flow.proxy.send(msg);
				callback && callback(msg);
				save();
				break;

			case 'sources':
				msg.TYPE = 'flow/sources';
				msg.data = flow.sources;
				flow.proxy.online && flow.proxy.send(msg, 1, clientid);
				callback && callback(msg);
				break;

			case 'pause':

				if (msg.id == null) {
					// entire flow
					flow.pause(msg.is);
					save();
					return;
				}

				if (msg.is) {
					if (!flow.meta.flow.paused)
						flow.meta.flow.paused = {};
					flow.meta.flow.paused[msg.id] = 1;
					save();
				} else {
					if (flow.meta.flow.paused) {
						delete flow.meta.flow.paused[msg.id];
						save();
					}
				}
				msg.TYPE = 'flow/pause';
				flow.proxy.online && flow.proxy.send(msg, 2, clientid);
				callback && callback(msg);
				break;

			case 'source_read':
				msg.TYPE = 'flow/source_read';
				msg.data = flow.sources[msg.id];
				msg.error = msg.data ? null : 'Not found';
				flow.proxy.online && flow.proxy.send(msg, 1, clientid);
				callback && callback(msg);
				break;

			case 'source_save':

				TMS.check(msg.data, function(err, meta) {

					if (err) {
						delete msg.data;
						msg.TYPE = 'flow/source_save';
						msg.error = err.toString();
						flow.proxy.online && flow.proxy.send(msg, 1, clientid);
						callback && callback(msg);
						return;
					}

					var source = flow.sources[msg.data.id];
					if (source) {
						source.name = msg.data.name;
						source.url = msg.data.url;
						source.token = msg.data.token;
						source.dtupdated = NOW;
						source.meta = meta;
						source.checksum = HASH(JSON.stringify(meta)) + '';
					} else {
						flow.sources[msg.data.id] = msg.data;
						msg.data.meta = meta;
						msg.data.checksum = HASH(JSON.stringify(meta)) + '';
					}

					TMS.refresh(flow);
					save();
					flow.proxy.online && flow.proxy.send({ TYPE: 'flow/source_save', callbackid: msg.callbackid, error: null }, 1, clientid);
					callback && callback(msg);
				});

				break;

			case 'source_remove':

				msg.TYPE = 'flow/remove';
				var source = flow.sources[msg.id];
				if (source) {
					delete flow.sources[msg.id];
					flow.sockets[msg.id] && flow.sockets[msg.id].destroy();
					var remove = [];
					for (var key in flow.meta.components) {
						var com = flow.meta.components[key];
						if (com.schemaid && com.schemaid[0] === msg.id)
							remove.push(key);
					}

					remove.wait(function(key, next) {
						flow.unregister(key, next);
					}, function() {
						refresh_components();
						save();
					});
				}

				msg.error = source == null ? 'Not found' : null;
				flow.proxy.online && flow.proxy.send(msg, 1, clientid);
				callback && callback(msg);
				break;

			case 'component_read':
				msg.TYPE = 'flow/component_read';
				msg.data = flow.meta.components[msg.id] ? flow.meta.components[msg.id].ui.raw : null;
				msg.error = msg.data == null ? 'Not found' : null;
				flow.proxy.online && flow.proxy.send(msg, 1, clientid);
				callback && callback(msg);
				break;

			case 'component_save':
				flow.add(msg.id, msg.data, function(err) {
					delete msg.data;
					msg.TYPE = 'flow/component_save';
					msg.error = err ? err.toString() : null;
					flow.proxy.online && flow.proxy.send(msg, 1, clientid);
					callback && callback(msg);
					refresh_components();
					save();
				});
				break;

			case 'component_remove':
				flow.unregister(msg.id, function() {
					refresh_components();
					save();
				});
				break;
		}
	};

	flow.errors = [];
	flow.variables = meta.variables;
	flow.variables2 = meta.variables2;
	flow.sockets = {};
	flow.$schema = meta;
	flow.httproutes = {};
	flow.secrets = {};

	if (meta.paused)
		flow.pause(true);

	flow.load(meta.components, meta.design, function() {

		if (flow.sources) {
			Object.keys(flow.sources).wait(function(key, next) {
				TMS.connect(flow, key, next);
			});
		}

		flow.ready = true;
		setImmediate(() => flow.proxy.done());
	});

	flow.components = function(prepare_export) {

		var self = this;
		var arr = [];

		for (var key in self.meta.components) {
			var com = self.meta.components[key];
			if (prepare_export) {
				var obj = {};
				obj.id = com.id;
				obj.meta = com.meta;
				obj.name = com.name;
				obj.type = com.type;
				obj.css = com.ui.css;
				obj.js = com.ui.js;
				obj.icon = com.icon;
				obj.config = com.config;
				obj.html = com.ui.html;
				obj.schema = com.schema ? com.schema.id : null;
				obj.readme = com.ui.readme;
				obj.template = com.ui.template;
				obj.settings = com.ui.settings;
				obj.inputs = com.inputs;
				obj.outputs = com.outputs;
				obj.group = com.group;
				obj.version = com.version;
				obj.author = com.author;
				obj.permissions = com.permissions;
				arr.push(obj);
			} else
				arr.push(com);
		}

		return arr;
	};

	var minutes = -1;
	var memory = 0;
	var notifier = 0;

	// Captures stats from the Flow
	flow.onstats = function(stats) {

		if (stats.minutes !== minutes) {
			minutes = stats.minutes;
			memory = process.memoryUsage().heapUsed;
		}

		flow.stats.memory = memory;
		flow.stats.errors = flow.errors.length;

		// Each 9 seconds
		if (notifier % 3 === 0) {
			notifier = 0;
			Parent && Parent.postMessage({ TYPE: 'stream/stats', data: { paused: flow.paused, messages: flow.stats.messages, pending: flow.stats.pending, memory: flow.stats.memory, minutes: flow.stats.minutes, errors: flow.stats.errors, mm: flow.stats.mm }});
		}

		notifier++;
		stats.paused = flow.paused;

		flow.stats.TYPE = 'flow/stats';
		flow.proxy.online && flow.proxy.send(stats);
	};

	var cleanerid;
	var problematic = [];
	var cleaner = function() {

		cleanerid = null;

		for (var key of problematic) {
			delete meta.components[key];
			flow.unregister(key);
		}

		if (flow.proxy.online)
			refresh_components();

		save();
	};

	var cleanerservice = function() {
		cleanerid && clearTimeout(cleanerid);
		cleanerid = setTimeout(cleaner, 500);
	};

	flow.onunregister = function(component) {
		for (var key in flow.httproutes) {
			var route = flow.httproutes[key];
			if (route && route.component === component.id)
				flow.proxy.httproute(key, null);
		}
	};

	flow.onregister = function(component) {
		if (!component.schema && component.schemaid && (component.type === 'pub' || component.type === 'sub' || component.type === 'call')) {
			var tmp = flow.sources[component.schemaid[0]];
			if (tmp && tmp.meta) {
				var arr = component.type === 'pub' ? tmp.meta.publish : component.type === 'call' ? tmp.meta.call : tmp.meta.subscribe;
				component.schema = arr.findItem('id', component.schemaid[1]);
				component.itemid = component.schemaid[0];
			} else {
				problematic.push(component.id);
				cleanerservice();
			}
		}
	};

	flow.httproute = function(url, callback) {
		flow.proxy.httproute(url, callback);
	};

	flow.ondisconnect = function(instance) {

		if (instance.$statusdelay) {
			clearTimeout(instance.$statusdelay);
			instance.$statusdelay = null;
		}

		for (var key in flow.httproutes) {
			var route = flow.httproutes[key];
			if (route && route.id === instance.id)
				flow.proxy.httproute(key, null);
		}
	};

	flow.onconnect = function(instance) {

		instance.env = instance.main.env;

		instance.httproute = function(url, callback) {
			flow.proxy.httproute(url, callback, instance);
		};

		instance.href = function(url) {
			var hostname = (flow.$schema.origin || '') + (flow.$schema.proxypath || '');

			if (url && hostname[hostname.length - 1] === '/')
				hostname = hostname.substring(0, hostname.length - 1);

			return url ? (hostname + url) : hostname;
		};

		instance.save = function() {
			var item = {};
			item.x = instance.x;
			item.y = instance.y;
			item.size = instance.size;
			item.offset = instance.offset;
			item.meta = instance.meta;
			item.note = instance.note;
			item.config = instance.config;
			item.outputs = instance.outputs;
			item.inputs = instance.inputs;
			item.tab = instance.tab;

			if (!flow.loading) {
				flow.cleanforce();
				save();
			}

			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/redraw', id: instance.id, data: item });
		};

		instance.newvariables = function(data) {
			flow.proxy.variables(data || {});
		};

		instance.newsecrets = function(data) {

			for (var key in data)
				flow.secrets[key] = data[key];

			for (var key in flow.meta.flow) {
				var m = flow.meta.flow[key];
				if (m.secrets)
					m.secrets(flow.secrets);
			}

		};

		instance.newflowstream = function(meta, isworker, callback) {
			return exports.init(meta, isworker, callback);
		};

		instance.io = function(flowstreamid, id, callback) {
			flow.proxy.io(flowstreamid, id, callback);
		};

		instance.toinput = function(data, flowstreamid, id) {
			flow.proxy.input(instance.id, flowstreamid, id, data);
		};

		instance.output = function(data, flowstreamid, id) {
			flow.proxy.output(instance.id, data, flowstreamid, id);
		};

		instance.reconfigure = function(config) {
			instance.main.reconfigure(instance.id, config);
		};
	};

	flow.io = function(flowstreamid, id, callback) {
		flow.proxy.io(flowstreamid, id, callback);
	};

	flow.onreconfigure = function(instance, init) {
		if (!init) {
			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/config', id: instance.id, data: instance.config });
			flow.proxy.refresh('configure');
			save();
		}
	};

	flow.onerror = function(err, source, instanceid) {

		err += '';

		var obj = {};
		obj.error = err;
		obj.id = instanceid || this.id;
		obj.ts = new Date();
		obj.source = source;

		flow.errors.unshift(obj);

		if (flow.errors.length > 10)
			flow.errors.pop();

		flow.proxy.online && flow.proxy.send({ TYPE: 'flow/error', error: err, id: obj.id, ts: obj.ts, source: source });
	};

	var sendstatusforce = function(instance) {
		instance.$statusdelay = null;
		if (instance.$status != null && flow.proxy.online)
			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/status', id: instance.id, data: instance.$status });
	};

	// component.status() will execute this method
	flow.onstatus = function(status, delay) {

		var instance = this;

		if (status != undefined)
			instance.$status = status;

		if (delay) {
			if (!instance.$statusdelay)
				instance.$statusdelay = setTimeout(sendstatusforce, delay || 1000, instance);
		} else if (instance.$status != null && flow.proxy.online)
			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/status', id: instance.id, data: instance.$status });
	};

	// component.dashboard() will execute this method
	flow.ondashboard = function(status) {

		var instance = this;

		if (status == null)
			status = instance.$dashboard;
		else
			instance.$dashboard = status;

		if (status != null && flow.proxy.online)
			flow.proxy.online && flow.proxy.send({ TYPE: 'flow/dashboard', id: instance.id, data: status });

	};

	var loaded = false;

	flow.on('schema', function() {
		if (flow.ready) {

			for (var key in flow.sockets)
				flow.sockets[key].synchronize();

			if (loaded)
				flow.proxy.refresh('schema');

			loaded = true;
		}
	});

	var makemeta = function() {
		return { TYPE: 'flow/flowstream', version: VERSION, paused: flow.paused, node: F.version_node, total: F.version, name: flow.$schema.name, version2: flow.$schema.version, icon: flow.$schema.icon, reference: flow.$schema.reference, author: flow.$schema.author, color: flow.$schema.color, origin: flow.$schema.origin, readme: flow.$schema.readme, url: flow.$schema.url, proxypath: flow.$schema.proxypath, env: flow.$schema.env, worker: isFLOWSTREAMWORKER ? (W.workerData ? 'Worker Thread' : 'Child Process') : false };
	};

	flow.proxy.refreshmeta = function() {
		flow.origin = flow.$schema.origin;
		flow.proxypath = flow.$schema.proxypath || '';
		flow.proxy.send(makemeta(), 0);
	};

	flow.proxy.newclient = function(clientid, metaonly) {
		if (flow.proxy.online) {
			flow.proxy.send(makemeta(), 1, clientid);
			if (!metaonly) {
				flow.proxy.send({ TYPE: 'flow/variables', data: flow.variables }, 1, clientid);
				flow.proxy.send({ TYPE: 'flow/variables2', data: flow.variables2 }, 1, clientid);
				flow.proxy.send({ TYPE: 'flow/components', data: flow.components(true) }, 1, clientid);
				var instances = flow.export();
				flow.proxy.send({ TYPE: 'flow/design', data: instances }, 1, clientid);
				flow.proxy.send({ TYPE: 'flow/errors', data: flow.errors }, 1, clientid);
				setTimeout(function() {
					flow.instances().wait(function(com, next) {
						com.status();
						setImmediate(next);
					}, 3);
				}, 1500);
			}
		}
	};

	return flow;
}

// TMS implementation:
TMS.check = function(item, callback) {

	WEBSOCKETCLIENT(function(client) {

		if (item.token)
			client.headers['x-token'] = item.token;

		client.options.reconnect = 0;

		client.on('open', function() {
			client.tmsready = true;
		});

		client.on('error', function(err) {
			client.tmsready = false;
			callback(err);
			clearTimeout(client.timeout);
		});

		client.on('close', function() {
			client.tmsready = false;
			callback('401: Unauthorized');
		});

		client.on('message', function(msg) {
			switch (msg.type) {
				case 'ping':
					msg.type = 'pong';
					client.send(msg);
					break;
				case 'meta':
					callback(null, msg);
					clearTimeout(client.timeout);
					client.close();
					break;
			}
		});

		client.timeout = setTimeout(function() {
			if (client.tmsready) {
				client.close();
				callback('408: Timeout');
			}
		}, 1500);

		client.connect(item.url.replace(/^http/g, 'ws'));
	});
};

function makemodel(item) {
	return { url: item.url, token: item.token, error: item.error };
}

TMS.connect = function(fs, sourceid, callback) {

	if (fs.sockets[sourceid]) {
		fs.sockets[sourceid].close();
		delete fs.sockets[sourceid];
	}

	WEBSOCKETCLIENT(function(client) {

		var item = fs.sources[sourceid];
		var prev;

		item.restart = false;
		client.options.reconnectserver = true;
		client.callbacks = {};
		client.callbackindexer = 0;
		client.callbacktimeout = function(callbackid) {
			var cb = client.callbacks[callbackid];
			if (cb) {
				delete client.callbacks[callbackid];
				cb(new ErrorBuilder().push(408)._prepare().items);
			}
		};

		if (item.token)
			client.headers['x-token'] = item.token;

		var syncforce = function() {
			client.synchronize();
		};

		client.on('open', function() {
			prev = null;
			fs.sockets[item.id] = client;
			item.error = 0;
			item.init = true;
			item.online = true;
			client.subscribers = {};
			client.tmsready = true;
			client.model = makemodel(item);
			setTimeout(syncforce, 10);
		});

		client.synchronize = function() {

			if (!client.tmsready)
				return;

			var publishers = {};

			for (var key in fs.meta.flow) {
				var instance = fs.meta.flow[key];
				var com = fs.meta.components[instance.component];
				if (com && com.itemid === item.id && com.outputs && com.outputs.length) {
					if (Object.keys(instance.connections).length)
						publishers[com.schema.id] = 1;
				}
			}

			var keys = Object.keys(publishers);
			var cache = keys.join(',');

			if (!prev || prev !== cache) {
				prev = cache;
				client.send({ type: 'subscribers', subscribers: keys });
			}

		};

		client.on('close', function(code) {

			if (code === 4001)
				client.destroy();

			item.error = code;
			item.online = false;

			client.model = makemodel(item);
			// AUDIT(client, 'close');

			delete fs.sockets[item.id];
			client.tmsready = false;
		});

		client.on('message', function(msg) {

			var type = msg.type || msg.TYPE;

			switch (type) {
				case 'meta':

					item.meta = msg;

					var checksum = HASH(JSON.stringify(msg)) + '1';
					client.subscribers = {};
					client.publishers = {};
					client.calls = {};

					for (var i = 0; i < msg.publish.length; i++) {
						var pub = msg.publish[i];
						client.publishers[pub.id] = pub.schema;
					}

					for (var i = 0; i < msg.subscribe.length; i++) {
						var sub = msg.subscribe[i];
						client.subscribers[sub.id] = 1;
					}

					if (msg.call) {
						for (var i = 0; i < msg.call.length; i++) {
							var call = msg.call[i];
							client.calls[call.id] = 1;
						}
					}

					if (item.checksum !== checksum) {
						item.checksum = checksum;
						item.init = false;
						TMS.refresh2(fs);
					}

					client.synchronize();
					break;

				case 'call':

					var callback = client.callbacks[msg.callbackid];
					if (callback) {
						callback.id && clearTimeout(callback.id);
						callback.callback(msg.error ? msg.data : null, msg.error ? null : msg.data);
						delete client.callbacks[msg.callbackid];
					}

					break;

				case 'subscribers':
					client.subscribers = {};
					if (msg.subscribers instanceof Array) {
						for (var i = 0; i < msg.subscribers.length; i++) {
							var key = msg.subscribers[i];
							client.subscribers[key] = 1;
						}
					}
					break;

				case 'publish':

					if (fs.paused)
						return;

					var schema = client.publishers[msg.id];
					if (schema) {
						// HACK: very fast validation
						var err = new ErrorBuilder();
						var data = framework_jsonschema.transform(schema, err, msg.data, true);
						if (data) {
							var id = 'pub' + item.id + 'X' + msg.id;
							for (var key in fs.meta.flow) {
								var flow = fs.meta.flow[key];
								if (flow.component === id)
									flow.process(data, client);
							}
						}
					}

					break;
			}

		});

		client.connect(item.url.replace(/^http/g, 'ws'));
		callback && setImmediate(callback);
	});
};

const TEMPLATE_PUBLISH = `<script total>

	exports.name = '{0}';
	exports.icon = '{3}';
	exports.config = {};
	exports.outputs = [{ id: 'publish', name: 'Output' }];
	exports.group = 'Publishers';
	exports.type = 'pub';
	exports.schemaid = ['{7}', '{1}'];

	exports.make = function(instance) {
		instance.process = function(msg, client) {
			instance.send('publish', msg, client);
		};
	};

</script>

<style>
	.f-{5} .url { font-size: 11px; }
</style>

<readme>
{2}
</readme>

<body>
	<header>
		<div><i class="{3} mr5"></i><span>{6} / <b>{1}</b></span></div>
		<div class="url">{4}</div>
	</header>
</body>`;

const TEMPLATE_SUBSCRIBE = `<script total>

	exports.name = '{0}';
	exports.icon = '{3}';
	exports.group = 'Subscribers';
	exports.config = {};
	exports.inputs = [{ id: 'subscribe', name: 'Input' }];
	exports.type = 'sub';
	exports.schemaid = ['{7}', '{1}'];

	exports.make = function(instance) {
		instance.message = function($) {
			var socket = instance.main.sockets['{7}'];
			if (socket && socket.subscribers && socket.subscribers['{1}']) {

				var data = $.data;

				/*
					var err = new ErrorBuilder();
					data = framework_jsonschema.transform(schema, err, data, true);

					if (err.is) {
						$.destroy();
						return;
					}

				*/

				socket.send({ type: 'subscribe', id: '{1}', data: data });
			}
			$.destroy();
		};
	};

</script>

<style>
	.f-{5} .url { font-size: 11px; }
</style>

<readme>
{2}
</readme>

<body>
	<header>
		<div><i class="{3} mr5"></i><span>{6} / <b>{1}</b></span></div>
		<div class="url">{4}</div>
	</header>
</body>`;

const TEMPLATE_CALL = `<script total>

	exports.name = '{0}';
	exports.icon = '{3}';
	exports.config = { timeout: 60000 };
	exports.inputs = [{ id: 'input', name: 'Input' }];
	exports.outputs = [{ id: 'output', name: 'Output' }, { id: 'error', name: 'Error' }];
	exports.group = 'Calls';
	exports.type = 'call';
	exports.schemaid = ['{7}', '{1}'];

	exports.make = function(instance, config) {

		instance.message = function($, client) {
			var socket = instance.main.sockets['{7}'];
			if (socket && socket.calls && socket.calls['{1}']) {

				var data = $.data;

				/*
					var err = new ErrorBuilder();
					data = framework_jsonschema.transform(schema, err, data, true);

					if (err.is) {
						$.send('error', err.toString());
						return;
					}

				*/

				var callback = function(err, response) {
					if (err)
						$.send('error', err);
					else
						$.send('output', response);
				};

				var callbackid = (socket.callbackindexer++) + '';

				if (socket.callbackindexer > 999999999)
					socket.callbackindexer = 0;

				socket.callbacks[callbackid] = { callback: callback, id: setTimeout(socket.callbacktimeout, config.timeout, callbackid) };
				socket.send({ type: 'call', id: '{1}', data: data, callbackid: callbackid });

			} else
				$.destroy();
		};
	};

</script>

<style>
	.f-{5} .url { font-size: 11px; }
</style>

<readme>
{2}
</readme>

<body>
	<header>
		<div><i class="{3} mr5"></i><span>{6} / <b>{1}</b></span></div>
		<div class="url">{4}</div>
	</header>
</body>`;

// Deprecated
/*
function makeschema(item) {

	var str = '';

	for (var key in item.properties) {
		var prop = item.properties[key];
		str += '<div><code>{0}</code><span>{1}</span></div>'.format(key, prop.type);
	}

	return str;
}*/

TMS.refresh = function(fs, callback) {

	Object.keys(fs.sources).wait(function(key, next) {

		var item = fs.sources[key];
		if (item.init) {

			if (item.restart || !fs.sources[key])
				TMS.connect(fs, item.id, next);
			else
				next();

		} else {

			var index = item.url.indexOf('/', 10);
			var url = item.url.substring(0, index);

			if (item.meta.publish instanceof Array) {
				for (var i = 0; i < item.meta.publish.length; i++) {
					var m = item.meta.publish[i];
					var readme = [];

					readme.push('# ' + m.id);
					readme.push('- URL address: <' + url + '>');
					readme.push('- Channel: __publish__');
					readme.push('- JSON schema `' + m.id + '.json`');
					readme.push('- Version: ' + VERSION);
					readme.push('');
					readme.push('\`\`\`json');
					readme.push(JSON.stringify(m.schema, null, '  '));
					readme.push('\`\`\`');

					var id = 'pub' + item.id + 'X' + m.id;
					var template = TEMPLATE_PUBLISH.format(item.meta.name, m.id, readme.join('\n'), m.icon || 'fas fa-broadcast-tower', m.url, id, item.meta.name.max(15), item.id); // makeschema(m.schema)
					var com = fs.add(id, template);
					m.url = url;
					com.type = 'pub';
					com.itemid = item.id;
					com.schema = m;
				}
			}

			if (item.meta.subscribe instanceof Array) {
				for (var i = 0; i < item.meta.subscribe.length; i++) {
					var m = item.meta.subscribe[i];
					var readme = [];

					readme.push('# ' + m.id);
					readme.push('- URL address: <' + url + '>');
					readme.push('- Channel: __subscribe__');
					readme.push('- JSON schema `' + m.id + '.json`');
					readme.push('- Version: ' + VERSION);
					readme.push('');
					readme.push('\`\`\`json');
					readme.push(JSON.stringify(m, null, '  '));
					readme.push('\`\`\`');

					var id = 'sub' + item.id + 'X' + m.id;
					var template = TEMPLATE_SUBSCRIBE.format(item.meta.name, m.id, readme.join('\n'), m.icon || 'fas fa-satellite-dish', m.url, id, item.meta.name.max(15), item.id); // makeschema(m.schema)
					var com = fs.add(id, template);
					m.url = url;
					com.type = 'sub';
					com.itemid = item.id;
					com.schema = m;
				}
			}

			if (item.meta.call instanceof Array) {
				for (var i = 0; i < item.meta.call.length; i++) {
					var m = item.meta.call[i];
					var readme = [];

					readme.push('# ' + m.id);
					readme.push('- URL address: <' + url + '>');
					readme.push('- Channel: __call__');
					readme.push('- JSON schema `' + m.id + '.json`');
					readme.push('- Version: ' + VERSION);
					readme.push('');
					readme.push('\`\`\`json');
					readme.push(JSON.stringify(m.schema, null, '  '));
					readme.push('\`\`\`');

					var id = 'cal' + item.id + 'X' + m.id;
					var template = TEMPLATE_CALL.format(item.meta.name, m.id, readme.join('\n'), m.icon || 'fa fa-plug', m.url, id, item.meta.name.max(15), item.id); // makeschema(m.schema)
					var com = fs.add(id, template);
					m.url = url;
					com.type = 'call';
					com.itemid = item.id;
					com.schema = m;
				}
			}

			if (item.socket)
				next();
			else
				TMS.connect(fs, item.id, next);
		}

	}, function() {

		var components = fs.meta.components;
		var unregister = [];

		for (var key in components) {
			var com = components[key];
			var type = com.type;
			if (type === 'pub' || type === 'sub' || type === 'call') {
				var index = key.indexOf('X');
				if (index !== -1) {

					var sourceid = key.substring(3, index);
					var subid = key.substring(index + 1);
					var source = fs.sources[sourceid];

					if (source) {
						if (type === 'call') {
							if (source.meta.call instanceof Array) {
								if (source.meta.call.findItem('id', subid))
									continue;
							}
						} else if (type === 'pub') {
							if (source.meta.publish instanceof Array) {
								if (source.meta.publish.findItem('id', subid))
									continue;
							}
						} else {
							if (source.meta.subscribe instanceof Array) {
								if (source.meta.subscribe.findItem('id', subid))
									continue;
							}
						}
					}

					unregister.push(key);
				}
			}
		}

		unregister.wait(function(key, next) {
			fs.unregister(key, next);
		}, function() {

			if (fs.proxy.online) {
				fs.proxy.send({ TYPE: 'flow/components', data: fs.components(true) });
				fs.proxy.send({ TYPE: 'flow/design', data: fs.export() });
			}

			fs.save();
			callback && callback();
		});

	});

};

TMS.synchronize = function(fs) {

	var sync = {};

	for (var key in fs.meta.components) {
		var com = fs.meta.components[key];
		if (com.itemid)
			sync[com.itemid] = fs.sources.findItem('id', com.itemid);
	}

	for (var key in sync) {
		var source = sync[key];
		if (source && source.socket)
			source.socket.synchronize();
	}
};

TMS.refresh2 = function(fs) {
	setTimeout2('tms_refresh_' + fs.name, fs => TMS.refresh(fs), 500, null, fs);
};

isFLOWSTREAMWORKER = W.workerData || process.argv.indexOf('--fork') !== -1;

// Runs the worker
if (W.workerData) {
	F.dir(PATH.join(__dirname, '../'));
	exports.init(W.workerData);
}

if (process.argv.indexOf('--fork') !== -1) {
	process.once('message', function(msg) {
		if (msg.TYPE === 'init') {
			Parent = process;
			if (!Parent.postMessage)
				Parent.postMessage = process.send;
			F.dir(process.argv[2]);
			exports.init(msg.data);
		}
	});
}

ON('service', function() {
	if (CALLBACKID > 999999999)
		CALLBACKID = 1;
});

ON('exit', function() {
	for (var key in FLOWS) {
		var flow = FLOWS[key];
		if (flow.terminate || flow.kill) {
			if (flow.terminate)
				flow.terminate();
			else
				flow.kill(9);
		}
	}
});
