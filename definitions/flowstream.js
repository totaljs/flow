const DB_FILE = 'database.json';
const DIRECTORY = CONF.directory || PATH.root('flowstream');
const PING = { TYPE: 'ping' };

PATH.mkdir(DIRECTORY);
PATH.mkdir(PATH.private());

var FS = {};

FS.version = 1;
FS.db = {};
FS.instances = {};

var saveid;

function skip(key, value) {
	return key === 'unixsocket' || key === 'env' ? undefined : value;
}

FS.save = function() {
	saveid && clearTimeout(saveid);
	saveid = setTimeout(FS.save_force, 1000);
};

FS.save_force = function() {

	saveid = null;

	for (var key in FS.db) {
		if (key !== 'variables') {
			var flow = FS.db[key];
			flow.size = Buffer.byteLength(JSON.stringify(flow));
		}
	}

	if (CONF.backup) {
		PATH.fs.rename(PATH.join(DIRECTORY, DB_FILE), PATH.join(DIRECTORY, DB_FILE.replace(/\.json/, '') + '_' + (new Date()).format('yyyyMMddHHmm') + '.bk'), function() {
			PATH.fs.writeFile(PATH.join(DIRECTORY, DB_FILE), JSON.stringify(FS.db, skip, '\t'), ERROR('FlowStream.save'));
		});
	} else
		PATH.fs.writeFile(PATH.join(DIRECTORY, DB_FILE), JSON.stringify(FS.db, skip, '\t'), ERROR('FlowStream.save'));

};

FS.init = function(id, next) {

	var flow = FS.db[id];

	flow.variables2 = FS.db.variables || {};
	flow.directory = CONF.directory || PATH.root('/flowstream/');
	flow.sandbox = CONF.flowstream_sandbox == true;
	flow.env = PREF.env || 'dev';

	if (!flow.memory)
		flow.memory = CONF.flowstream_memory || 0;

	MODULE('flowstream').init(flow, CONF.flowstream_worker, function(err, instance) {

		if (CONF.flowstream_worker && flow.proxypath) {

			// Removes old
			PROXY(flow.proxypath, null);

			// Registers new
			PROXY(flow.proxypath, flow.unixsocket, false);
		}

		instance.httprouting();
		instance.ondone = () => next();
		instance.onerror = function(err, source, id, component, stack) {
			var empty = '---';
			var output = '';
			output += '|------------- FlowError: ' + new Date().format('yyyy-MM-dd HH:mm:ss') + '\n';
			output += '| ' + err.toString() + '\n';
			output += '| Name: ' + flow.name + '\n';
			output += '| Source: ' + (source || empty) + '\n';
			output += '| Instance ID: ' + (id || empty) + '\n';
			output += '| Component ID: ' + (component || empty) + '\n';
			output += '|---- Stack: ----\n';
			output += stack;
			console.error(output);
			var meta = {};
			meta.error = err;
			meta.source = source;
			meta.id = id;
			meta.component = component;
			EMIT('flowstream_error', meta);
		};

		instance.onsave = function(data) {
			data.unixsocket = flow.unixsocket;
			EMIT('flowstream_save', data);
			FS.db[id] = data;
			FS.save();
		};

		FS.instances[id] = instance;
	});
};

ON('ready', function() {

	PATH.fs.readFile(PATH.join(DIRECTORY, DB_FILE), function(err, data) {

		FS.db = data ? data.toString('utf8').parseJSON(true) : {};
		EMIT('flowstream_init', FS.db);

		if (!FS.db.variables)
			FS.db.variables = {};

		Object.keys(FS.db).wait(function(key, next) {
			if (key === 'variables')
				next();
			else
				FS.init(key, next);
		});

	});

	// A simple prevetion for the Flow zombie processes
	CONF.flowstream_worker && setInterval(function() {
		// ping all services
		for (var key in FS.instances) {
			var fs = FS.instances[key];
			if (fs.isworkerthread && fs.flow && fs.flow.postMessage2)
				fs.flow.postMessage2(PING);
		}
	}, 5000);

});

MAIN.flowstream = FS;