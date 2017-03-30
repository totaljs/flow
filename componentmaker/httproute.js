exports.id = 'httproute';
exports.title = 'HTTP Route';
exports.group = 'HTTP';
exports.color = '#5D9CEC';
exports.icon = 'globe';
exports.input = false;
exports.output = 1;
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.readme = `# HTTP route

When a request comes in bellow object is available by using \`flowdata.get('request')\`:
\`\`\`javascript
{
	params: { id: '1' },     // params for dynamic routes, e.g. /test/{id}
	query: { msg: 'Hello' }, // parsed query string, e.g. /test/1?msg=Hello
	body: { test: 'OK' }     // object for json requests otherwise string
}
\`\`\``;

exports.html = `<div class="padding">
	<div data-jc="textbox" data-jc-path="url" class="m" data-required="true" data-maxlength="500" data-placeholder="/api/test">@(URL address)</div>
	<div class="row">
		<div class="col-md-6 m">
			<div data-jc="dropdown" data-jc-path="method" data-required="true" data-options=";GET;POST;PUT;DELETE">@(HTTP method)</div>
		</div>
		<div class="col-md-6 m">
			<!--<div data-jc="dropdown" data-jc-path="datatype" data-required="true">@(Data-type - JSON by default)</div>-->
		</div>
	</div>
	<div data-jc="keyvalue" data-jc-path="headers" data-placeholder-key="@(Header name)" data-placeholder-value="@(Header value and press enter)" class="m">@(Custom headers)</div>
	<div data-jc="keyvalue" data-jc-path="cookies" data-placeholder-key="@(Cookie name)" data-placeholder-value="@(Cookie value and press enter)" class="m">@(Cookies)</div>
</div>`;

exports.install = function(instance) {

	var id, params;

	instance.custom.action = function() {
		var data = {
			query: this.query,
			body: this.body
		}
		if (params.length) {
			data.params = {};
			for (var i = 0, length = arguments.length; i < length; i++)
				data.params[params[i]] = arguments[i];
		}
		instance.send(data).set('controller', this);
	};

	instance.reconfigure = function() {

		var options = instance.options;

		if (!options.url) {
			instance.status('Not configured', 'red');
			return;
		}

		if (typeof(options.flags) === 'string')
			options.flags = options.flags.split('|');

		id && UNINSTALL('route', id);
		id = 'id:' + U.GUID(10);
		params = [];
		options.url.split('/').forEach(param => param[0] === '{' && params.push(param.substring(1, param.length - 1).trim()));

		var flags = options.flags || [];
		flags.push(id);
		flags.push(options.method.toLowerCase());

		F.route(options.url, instance.custom.action, flags);
		instance.status('Listening', 'green');
	};

	instance.reconfigure();
	instance.on('options', instance.reconfigure);
};