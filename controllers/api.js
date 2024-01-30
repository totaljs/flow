exports.install = function() {

	// REST API
	ROUTE('-POST    ?/auth/        --> Auth/exec');
	ROUTE('+GET     ?/logout/      --> Auth/logout');
	ROUTE('+POST    ?/password/    --> Auth/save');
	ROUTE('+POST    ?/update/ @upload <10MB', updatebundle); // Flow updater
	ROUTE('GET       /private/',          privatefiles);
	ROUTE('GET       /notify/{id}/',      notify);
	ROUTE('POST      /notify/{id}/ <1MB', notify); // 1 MB

	// FlowStream
	ROUTE('+API     ?    -streams                          --> Streams/query');
	ROUTE('+API     ?    -streams_read/{id}                --> Streams/read');
	ROUTE('+API     ?    +streams_save                     --> Streams/save');
	ROUTE('+API     ?    -streams_remove/{id}              --> Streams/remove');
	ROUTE('+API     ?    -streams_stats                    --> Streams/stats');
	ROUTE('+API     ?    -streams_pause/{id}               --> Streams/pause');
	ROUTE('+API     ?    -streams_restart/{id}             --> Streams/restart');
	ROUTE('+API     ?    -console                          --> Console/read');
	ROUTE('+API     ?    -console_clear                    --> Console/clear');
	ROUTE('+API     ?    -cdn_clear                        --> CDN/clear');

	// Common
	ROUTE('+API     ?    -auth                             --> Auth/read');

	// Variables
	ROUTE('+API     ?    -settings                         --> Settings/read');
	ROUTE('+API     ?    +settings_save                    --> Settings/save');

	// Variables
	ROUTE('+API     ?    -variables                        --> Variables/read');
	ROUTE('+API     ?    +variables_save                   --> Variables/save');

	// Clipboard
	ROUTE('+API     ?    -clipboard_export/id              --> Clipboard/export');
	ROUTE('+API     ?    +clipboard_import       <300s     --> Clipboard/import');

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