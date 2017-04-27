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

HTTP response will respond with data recieved using data-type set in Settings form or plain text if not set.`;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-6 m">
			<div data-jc="dropdown" data-jc-path="datatype" data-required="true" data-options=";Empty response|emptyresponse;JSON|json;HTML|html;Plain text|plain;XML|xml">@(Response data-type (json by default))</div>
		</div>
	</div>
	<!--<div data-jc="keyvalue" data-jc-path="headers" data-placeholder-key="@(Header name)" data-placeholder-value="@(Header value and press enter)" class="m">@(Custom headers)</div>
	<div data-jc="keyvalue" data-jc-path="cookies" data-placeholder-key="@(Cookie name)" data-placeholder-value="@(Cookie value and press enter)" class="m">@(Cookies)</div>-->
</div>`;

const ERRORMESSAGE = {};

exports.install = function(instance) {

	instance.on('data', function(flowdata){
		var ctrl = flowdata.get('controller');
		var data = flowdata.data;

		if (!ctrl) {
			ERRORMESSAGE.error = 'No controller to use for response!';
			ERRORMESSAGE.data = data;
			instance.debug(ERRORMESSAGE, 'error');
			return;
		}

		var datatype = instance.options.datatype;

		if (datatype === 'emptyresponse')
			return ctrl.plain('');

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
