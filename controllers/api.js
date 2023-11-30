exports.install = function() {

	// REST API
	ROUTE('-POST    /fapi/auth/        --> Auth/exec');
	ROUTE('+GET     /fapi/logout/      --> Auth/logout');
	ROUTE('+POST    /fapi/password/    --> Auth/save');
	ROUTE('+POST    /fapi/update/ @upload <10MB', updatebundle); // Flow updater
	ROUTE('GET      /private/',          privatefiles);
	ROUTE('GET      /notify/{id}/',      notify);
	ROUTE('POST     /notify/{id}/ <1MB', notify); // 1 MB

	// FlowStream
	ROUTE('+API    /fapi/    -streams                          --> Streams/query');
	ROUTE('+API    /fapi/    -streams_read/{id}                --> Streams/read');
	ROUTE('+API    /fapi/    +streams_save                     --> Streams/save');
	ROUTE('+API    /fapi/    -streams_remove/{id}              --> Streams/remove');
	ROUTE('+API    /fapi/    -streams_stats                    --> Streams/stats');
	ROUTE('+API    /fapi/    -streams_pause/{id}               --> Streams/pause');
	ROUTE('+API    /fapi/    -streams_restart/{id}             --> Streams/restart');
	ROUTE('+API    /fapi/    -console                          --> Console/read');
	ROUTE('+API    /fapi/    -console_clear                    --> Console/clear');
	ROUTE('+API    /fapi/    -cdn_clear                        --> CDN/clear');

	// Common
	ROUTE('+API    /fapi/    -auth                             --> Auth/read');

	// Variables
	ROUTE('+API    /fapi/    -settings                         --> Settings/read');
	ROUTE('+API    /fapi/    +settings_save                    --> Settings/save');

	// Variables
	ROUTE('+API    /fapi/    -variables                        --> Variables/read');
	ROUTE('+API    /fapi/    +variables_save                   --> Variables/save');

	// Clipboard
	ROUTE('+API    /fapi/    -clipboard_export/id              --> Clipboard/export');
	ROUTE('+API    /fapi/    +clipboard_import       <300s     --> Clipboard/import');

	// Socket
	ROUTE('+SOCKET  /flows/{id}/ <8MB', socket); // max. 8 MB
};

function socket($) {
	Flow.socket($.params.id, $);
}

function privatefiles($) {

	if (!PREF.token) {
		$.invalid(401);
		return;
	}

	if (BLOCKED($, 10, '15 minutes'))
		return;

	if ($.query.token !== PREF.token) {
		$.invalid(401);
		return;
	}

	BLOCKED($, -1);

	var filename = $.query.filename;
	if (filename) {

		filename = filename.replace(/\.{2,}|~|\+|\/|\\/g, '');
		$.nocache();

		var path = PATH.private(filename);

		F.Fs.lstat(path, function(err, stat) {

			if (err) {
				$.throw404();
				return;
			}

			var offset = $.query.offset;
			var opt = {};

			if (offset) {
				offset = U.parseInt(offset);
				opt.start = offset;
			}

			var stream = F.Fs.createReadStream(path, opt);

			$.nocache();
			$.stream(stream, U.contentTypes[U.getExtension(path)], filename, { 'x-size': stat.size, 'last-modified': stat.mtime.toUTCString() });

		});

		return;
	}

	var q = $.query.q;

	U.ls2(PATH.private(), function(files) {
		var arr = [];
		for (var file of files)
			arr.push({ name: file.filename.substring(file.filename.lastIndexOf('/') + 1), size: file.stats.size, modified: file.stats.mtime });
		$.json(arr);
	}, q);
}

function updatebundle($) {

	var file = $.files[0];

	if (!F.isBundle) {
		$.invalid('@(Available for bundled version only)');
		return;
	}

	if (file && file.ext === 'bundle') {
		file.move(PATH.join(PATH.root(), '../bundles/app.bundle'), function(err) {
			if (err) {
				$.invalid(err);
			} else {
				$.success();
				setTimeout(() => F.restart(), 1000);
			}
		});
	} else
		$.invalid('Invalid file');
}

function notify($) {
	Flow.notify($, $.params.id);
}