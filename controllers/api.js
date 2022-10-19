exports.install = function() {

	// REST API
	ROUTE('-POST    /fapi/auth/        *Auth       --> exec');
	ROUTE('+GET     /fapi/logout/      *Auth       --> logout');
	ROUTE('+POST    /fapi/password/    *Auth       --> save');
	ROUTE('+POST    /fapi/update/',    updatebundle, ['upload'], 1024 * 10); // Flow updater
	ROUTE('GET      /private/',        privatefiles);
	ROUTE('GET      /notify/{id}/',    notify);
	ROUTE('POST     /notify/{id}/',    notify);

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
	ROUTE('+API    @api    -cdn_clear                        *CDN          --> clear');

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
	ROUTE('+SOCKET  /fapi/  @api',  1024 * 8); // max. 8 MB
	ROUTE('+SOCKET  /flows/{id}/',  socket, 1024 * 8); // max. 8 MB
};

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

			$.nocache();
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

function updatebundle() {

	var self = this;
	var file = self.files[0];

	if (!F.isBundle) {
		self.invalid('@(Available for bundled version only)');
		return;
	}

	if (file && file.extension === 'bundle') {
		file.move(F.Path.join(PATH.root(), '../bundles/app.bundle'), function(err) {
			if (err) {
				self.invalid(err);
			} else {
				self.success();
				setTimeout(() => F.restart(), 1000);
			}
		});
	} else
		self.invalid('Invalid file');
}

function notify(id) {

	var self = this;

	if (PREF.notify) {
		var arr = id.split('-');
		var instance = MAIN.flowstream.instances[arr[0]];
		if (instance) {
			var obj = {};
			obj.id = arr[1];
			obj.method = self.method;
			obj.headers = self.headers;
			obj.query = self.query;
			obj.body = self.body;
			obj.ip = self.ip;
			arr[1] && instance.notify(arr[1], obj);
			instance.flow && instance.flow.$socket && instance.flow.$socket.send({ TYPE: 'flow/notify', data: obj });
		}
	}

	self.html('<html><body style="font-family:Arial;font-size:11px;color:#777;background-color:#FFF">Close the window<script>window.close();</script></body></html>');
}