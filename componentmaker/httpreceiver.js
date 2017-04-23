const TRIGGER = 'getReceiverRoutes';

exports.id = 'receiver';
exports.title = 'HTTP Receiver';
exports.group = 'HTTP';
exports.color = '#5D9CEC';
exports.icon = 'server';
exports.output = 1;
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.options = { route: 0 };
exports.cloning = false;

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="route" data-source="receiverroutes" data-empty="" data-jc-type="number" class="m">@(Choose a route)</div>
</div>
<script>ON('open.receiver', function(component, options) {
	TRIGGER('{0}', 'receiverroutes');
});</script>`.format(TRIGGER);

exports.readme = `# HTTP Receiver

This component can receive all data from this web application. Choose which route data you want to receive and everything will work automatically. __Response__ is an object:

\`\`\`javascript
response.body;      // (Object) Request body (POST/PUT/DELETE)
response.files;     // (Object Array) Uploaded files
response.id;        // (String/Number) Record ID (if exists)
response.ip;        // (String) Current IP
response.method;    // (String) HTTP method
response.path;      // (Array) Splitted path
response.query;     // (Object) Query string arguments
response.session;   // (Object) Session instance (if exists)
response.url;       // (String) Current URL
response.user;      // (Object) User instance (if exists)
\`\`\``;

exports.install = function(instance) {

	instance.custom.event = function(controller) {
		if (controller.route.hash !== instance.options.route)
			return;
		var data = {};
		data.user = controller.user;
		data.session = controller.session;
		data.method = controller.method;
		data.ip = controller.ip;
		data.body = typeof(controller.body.$clean) === 'function' ? controller.body.$clean() : controller.body;
		data.files = controller.files;
		data.query = controller.query;
		data.url = controller.url;
		data.id = controller.id;
		data.path = controller.req.split;
		instance.send(data);
	};

	F.on('controller', instance.custom.event);
	instance.on('close', () => F.removeListener('controller', instance.custom.event));
};

FLOW.trigger(TRIGGER, function(next) {
	var items = [];
	for (var i = 0, length = F.routes.web.length; i < length; i++) {
		var item = F.routes.web[i];
		items.push({ priority: (item.method === 'GET' ? 1 : item.method === 'POST' ? 2 : item.method === 'PUT' ? 3 : 4).toString() + item.urlraw.length.toString(), id: item.hash, name: item.method + ': ' + item.urlraw + (item.schema ? ' (Schema: {0})'.format(item.schema[0] === 'default' ? item.schema[1] : item.schema.join('/')) : '') });
	}
	items.quicksort('priority');
	next(items);
});

exports.uninstall = function() {
	FLOW.trigger(TRIGGER, null);
};