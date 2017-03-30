exports.id = 'lastusage';
exports.title = 'Last usage';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.color = '#656D78';
exports.input = true;
exports.icon = 'calendar';
exports.options = { format: 'dd.MM.yyyy HH:mm:ss' };
exports.readme = `# Last usage

This component remembers date and time of last usage.`;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-4">
			<div data-jc="textbox" data-jc-path="format" data-placeholder="@(dd.MM.yyyy HH:mm:ss)" data-maxlength="25" data-align="center">@(Date format)</div>
		</div>
	</div>
</div>`;

exports.install = function(instance) {

	var lastusage = null;

	instance.on('data', function() {
		lastusage = new Date();
		instance.custom.status();
	});

	instance.custom.status = function() {
		lastusage && setTimeout2(instance.id, () => instance.status(lastusage.format(instance.options.format)), 100);
	};

	instance.on('options', instance.custom.status);
};