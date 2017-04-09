exports.id = 'httplistener';
exports.title = 'HTTP Listener';
exports.group = 'HTTP';
exports.color = '#5D9CEC';
exports.icon = 'exchange';
exports.output = 1;
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.options = { staticfiles: false };
exports.cloning = false;

exports.html = `<div class="padding">
	<div data-jc="checkbox" data-jc-path="staticfiles" class="m">@(Include static files)</div>
</div>`;

exports.readme = `# HTTP Listener

Can capture all received requests.

\`\`\`javascript
response.body;      // Request body (POST/PUT/DELETE)
response.files;     // Uploaded files
response.id;        // Record ID (if exists)
response.ip;        // Current IP
response.method;    // String
response.path;      // Splitted path
response.query;     // Query string arguments
response.session;   // Session instance (if exists)
response.url;       // Current URL
response.user;      // User instance (if exists)
response.file;      // Is a static file?
response.extension; // File extension
\`\`\``;

exports.install = function(instance) {

	instance.custom.eventstaticfiles = function(req) {

		if (!req.isStaticFile)
			return;

		var data = {};
		data.user = null;
		data.session = null;
		data.ip = req.ip;
		data.method = req.method;
		data.body = req.body;
		data.files = req.files;
		data.query = req.query;
		data.url = req.url;
		data.id = null;
		data.path = req.req.split;
		data.file = true;
		data.extension = req.extension;
		instance.send(data);
	};

	instance.custom.event = function(controller) {
		var data = {};
		data.user = controller.user;
		data.session = controller.session;
		data.ip = controller.ip;
		data.method = controller.method;
		data.body = controller.body;
		data.files = controller.files;
		data.query = controller.query;
		data.url = controller.url;
		data.id = controller.id;
		data.path = controller.req.split;
		data.file = false;
		data.extension = null;
		instance.send(data);
	};

	F.on('controller', instance.custom.event);

	instance.reconfigure = function() {
		var options = instance.options;
		if (options.staticfiles)
			F.on('request', instance.custom.eventstaticfiles);
		else
			F.removeListener('request', instance.custom.eventstaticfiles);
	};

	instance.on('close', function() {
		F.removeListener('request', instance.custom.event);
		F.removeListener('controller', instance.custom.event);
	});

	instance.reconfigure();
};