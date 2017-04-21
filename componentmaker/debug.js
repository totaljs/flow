exports.id = 'debug';
exports.title = 'Debug';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.color = '#967ADC';
exports.click = true;
exports.input = true;
exports.options = { enabled: true };
exports.readme = `# Debug

Writes data to the debug tab

## Config

- enabled \`->\` enable/disable output to the debug tab`;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-12">
			<div data-jc="textbox" data-jc-path="property" data-placeholder="" class="m">Property (leave empty to show whole data object)</div>
			<div data-jc="checkbox" data-jc-path="enabled">@(Enabled)</div>
		</div>
	</div>
</div>`;

exports.install = function(instance) {

	instance.on('data', function(response) {
		var options = instance.options;
		options.enabled && instance.debug(options.property ? U.get(response.data, options.property) : response);
	});

	instance.on('click', function() {
		instance.options.enabled = !instance.options.enabled;
		instance.custom.status();
		instance.save();
	});

	instance.on('options', function(options) {
		instance.custom.status();
	});

	instance.custom.status = function() {
		instance.status(instance.options.enabled ? 'Enabled' : 'Disabled');
	};

	instance.custom.status();
};