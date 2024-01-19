NEWACTION('Clipboard/export', {
	name: 'Export stream',
	params: '*id',
	action: function($) {
		var id = $.params.id;
		var item = Flow.db[id];
		if (item)
			$.success(JSON.stringify(item));
		else
			$.invalid(404);
	}
});

NEWACTION('Clipboard/import', {
	name: 'Import stream',
	input: '*data:String',
	action: function($, model) {

		var data = model.data.parseJSON(true);

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
			var db = Flow.db;
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