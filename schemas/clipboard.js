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

		if (!data.design)
			data.design = {};

		if (!data.components)
			data.components = {};

		if (!data.variables)
			data.variables = {};

		data.dtcreated = NOW;

		if (data.proxypath) {
			var db = Flow.db;
			for (var key in db) {
				if (db[key].proxypath === data.proxypath) {
					data.proxypath = '';
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