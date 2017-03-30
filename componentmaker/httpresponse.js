exports.id = 'httpresponse';
exports.title = 'HTTP Response';
exports.group = 'HTTP';
exports.color = '#5D9CEC';
exports.icon = 'arrow-right';
exports.input = true;
exports.output = 0;
exports.version = '1.0.0';
exports.author = 'Martin Smola';
exports.readme = `# HTTP response

Expects data object as shown bellow.
The response property will be used as reponse body
\`\`\`javascript
{
	response: String|Object // depends on response data-type set in options
}
\`\`\``;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-6 m">
			<div data-jc="dropdown" data-jc-path="datatype" data-required="true" data-options=";JSON|json;HTML|html;Plain text|plain;XML|xml">@(Response data-type (json by default))</div>
		</div>
	</div>
	<!--<div data-jc="keyvalue" data-jc-path="headers" data-placeholder-key="@(Header name)" data-placeholder-value="@(Header value and press enter)" class="m">@(Custom headers)</div>
	<div data-jc="keyvalue" data-jc-path="cookies" data-placeholder-key="@(Cookie name)" data-placeholder-value="@(Cookie value and press enter)" class="m">@(Cookies)</div>-->
</div>`;

const ERRORMESSAGE = {};

exports.install = function(instance) {

	instance.on('data', function(flowdata){
		var ctrl = flowdata.get('controller');
		
		// if the connection is `httproute -> httpresponse` then do not send any data
		var data = flowdata.parent.component === 'httproute' ? '' :  flowdata.data || '';

		if (!ctrl) {
			ERRORMESSAGE.error = 'No controller to use for response!';
			ERRORMESSAGE.data = data;
			instance.debug(ERRORMESSAGE, 'error');
			return;
		}

		var datatype = instance.options.datatype;
		if (datatype !== 'json' && typeof(data) !== 'string') {
			ERRORMESSAGE.error = 'Incorect type of data, expected string, got ' + typeof(data);
			ERRORMESSAGE.data = data;
			instance.debug(ERRORMESSAGE, 'error');
		}

		switch(datatype) {
			case 'html':
				ctrl.content(data, 'text/html');
				break;
			case 'plain':
				ctrl.plain(data);
				break;
			case 'xml':
				ctrl.content(data, 'text/xml');
				break;
			default:
				ctrl.json(data);
				break;
		}
	});
};