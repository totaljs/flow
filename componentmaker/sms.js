exports.id = 'sms';
exports.title = 'SMS';
exports.group = 'Notifications';
exports.color = '#8CC152';
exports.input = true;
exports.author = 'Peter Širka';
exports.icon = 'commenting-o';

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-6 m">
			<div data-jc="textbox" data-jc-path="key" class="m" data-required="true" data-maxlength="30" data-jc-type="password">@(NEXMO Key)</div>
		</div>
		<div class="col-md-6 m">
			<div data-jc="textbox" data-jc-path="secret" class="m" data-required="true" data-maxlength="35" data-jc-type="password">@(NEXMO Secret)</div>
		</div>
	</div>
	<div class="row">
		<div class="col-md-6 m">
			<div data-jc="textbox" data-jc-path="sender" class="m" data-required="true" data-maxlength="30" data-placeholder="@(Phone number or Text)">@(Sender name)</div>
		</div>
		<div class="col-md-6 m">
			<div data-jc="textbox" data-jc-path="target" class="m" data-required="true" data-maxlength="30" data-placeholder="@(International format)">@(Phone number)</div>
		</div>
	</div>
</div>`;

exports.readme = `# SMS sender

The component has to be configured. Sender uses [NEXMO API provider](https://www.nexmo.com). Raw data will be send as a SMS message.`;

exports.install = function(instance) {

	var can = false;

	instance.on('data', function(response) {
		can && instance.custom.send(response.data);
	});

	instance.custom.send = function(message) {
		RESTBuilder.make(function(builder) {
			builder.url('https://rest.nexmo.com/sms/json?api_key={0}&api_secret={1}&from={2}&to={3}&text={4}&type=unicode'.format(instance.options.key, instance.options.secret, encodeURIComponent(instance.options.sender), instance.options.target, encodeURIComponent(typeof(message) === 'object' ? JSON.stringify(message) : message.toString())));
			builder.exec(function(err, response) {
				LOGGER('sms', 'response:', JSON.stringify(response), 'error:', err);
			});
		});
	};

	instance.reconfigure = function() {
		can = instance.options.key && instance.options.secret && instance.options.sender && instance.options.target ? true : false;
		instance.status(can ? '' : 'Not configured', can ? undefined : 'red');
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};