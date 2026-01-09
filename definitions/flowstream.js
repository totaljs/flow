const DBFILE = 'database.json';
const DIRECTORY = CONF.directory || PATH.root('flowstream');

CONF.$customtitles = true;

PATH.mkdir(DIRECTORY);
PATH.mkdir(PATH.private());

function skip(key, value) {
	return key === 'unixsocket' || key === 'env' || key === 'import' || key === 'importscript' || key === 'worker' || key === 'asfiles' ? undefined : value;
}

Flow.on('save', function() {

	for (var key in Flow.db) {
		if (key !== 'variables') {
			let flow = Flow.db[key];
			flow.size = Buffer.byteLength(JSON.stringify(flow));
		}
	}

	if (CONF.backup) {
		PATH.fs.rename(PATH.join(DIRECTORY, DBFILE), PATH.join(DIRECTORY, DBFILE.replace(/\.json/, '') + '_' + (new Date()).format('yyyyMMddHHmm') + '.bk'), function() {
			PATH.fs.writeFile(PATH.join(DIRECTORY, DBFILE), JSON.stringify(Flow.db, skip, '\t'), ERROR('FlowStream.save'));
		});
	} else
		PATH.fs.writeFile(PATH.join(DIRECTORY, DBFILE), JSON.stringify(Flow.db, skip, '\t'), ERROR('FlowStream.save'));
});

function init(id, next) {

	var flow = Flow.db[id];

	flow.variables2 = Flow.db.variables || {};
	flow.directory = CONF.directory || PATH.root('/flowstream/');
	flow.sandbox = CONF.flowstream_sandbox == true;
	flow.env = PREF.env || 'dev';

	if (!flow.memory)
		flow.memory = CONF.flowstream_memory || 0;

	flow.asfiles = CONF.flowstream_asfiles === true;
	flow.worker = 'fork'; // "worker", "false"

	flow.import = 'extensions.js';
	// flow.importscript = 'instance';

	Flow.load(flow, () => next());

	/*
	Flow.load(flow, function(err, instance) {
		next();
	});*/
}

ON('start', function() {

	PATH.fs.readFile(PATH.join(DIRECTORY, DBFILE), function(err, data) {

		Flow.db = data ? data.toString('utf8').parseJSON(true) : {};

		if (!Flow.db.variables)
			Flow.db.variables = {};

		Object.keys(Flow.db).wait(function(key, next) {
			if (key === 'variables')
				next();
			else
				init(key, next);
		});

	});

});