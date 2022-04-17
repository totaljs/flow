exports.install = function() {

	// REST API
	ROUTE('-POST    /fapi/auth/        *Auth       --> exec');
	ROUTE('+GET     /fapi/logout/      *Auth       --> logout');
	ROUTE('+POST    /fapi/password/    *Auth       --> save');
	ROUTE('GET      /private/',   privatefiles);

	// FlowStream
	ROUTE('+API    @api    -streams                          *Streams      --> query');
	ROUTE('+API    @api    -streams_read/{id}                *Streams      --> read');
	ROUTE('+API    @api    +streams_save                     *Streams      --> save');
	ROUTE('+API    @api    -streams_remove/{id}              *Streams      --> remove');
	ROUTE('+API    @api    -streams_stats                    *Streams      --> stats');
	ROUTE('+API    @api    -streams_pause/{id}               *Streams      --> pause');
	ROUTE('+API    @api    -streams_restart/{id}             *Streams      --> restart');
	ROUTE('+API    @api    -console                          *Console      --> read');
	ROUTE('+API    @api    -console_clear                    *Console      --> clear');

	// Common
	ROUTE('+API    @api    -auth                             *Auth         --> read');

	// Variables
	ROUTE('+API    @api    -settings                         *Settings     --> read');
	ROUTE('+API    @api    +settings_save                    *Settings     --> save');

	// Variables
	ROUTE('+API    @api    -variables                        *Variables    --> read');
	ROUTE('+API    @api    +variables_save                   *Variables    --> save');

	// Clipboard
	ROUTE('+API    @api    -clipboard_export/id              *Clipboard    --> export');
	ROUTE('+API    @api    +clipboard_import                 *Clipboard    --> import', [60000 * 5]);

	// Socket
	ROUTE('+SOCKET  /fapi/  @api', 1024 * 8); // max. 8 MB
	ROUTE('+SOCKET  /flows/{id}/', socket, 1024 * 8); // max. 8 MB

	// Local CDN
	ROUTE('FILE     /fapi/*.html', uicdn);
};

MAIN.cdn = {};
PATH.mkdir(PATH.public('cdn'));

function uicdn(req, res) {

	var filename = req.split[1];
	var key = 'cdnui_' + filename;

	if (MAIN.cdn[key] === 1) {
		setTimeout(uicdn, 500, req, res);
		return;
	}

	var path = PATH.public(PATH.join('cdn', filename));

	if (MAIN.cdn[key] === 2) {
		res.file(path);
		return;
	}

	MAIN.cdn[key] = 1;
	PATH.exists(filename ,function(err, response) {
		if (response) {
			MAIN.cdn[key] = 2;
			res.file(path);
		} else {
			// Download
			DOWNLOAD('https://cdn.componentator.com/' + filename, path, function() {
				MAIN.cdn[key] = 2;
				res.file(path);
			});
		}
	});
}

function socket(id) {
	var self = this;
	MODULE('flowstream').socket(id, self);
}

function privatefiles() {
	var $ = this;

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
			$.stream(stream, U.getContentType(U.getExtension(path)), filename, { 'x-size': stat.size, 'last-modified': stat.mtime.toUTCString() });

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
