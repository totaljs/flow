exports.id = 'merge';
exports.title = 'Merge';
exports.group = 'Common';
exports.color = '#656D78';
exports.input = true;
exports.click = true;
exports.output = 1;
exports.options = { count: 5 };
exports.author = 'Peter Širka';
exports.icon = 'compress';

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3">
			<div data-jc="textbox" data-jc-path="count" class="m" data-required="true" data-placeholder="5" data-jc-type="number" data-increment="true" data-align="center">@(Count)</div>
		</div>
	</div>
</div>`;

exports.readme = `# Merge

This component merges all received data into the \`Array\`. Clicking on the button will empty the queue.`;

exports.install = function(instance) {
	var data = [];
	instance.on('data', function(response) {
		response.data && data.push(response.data);
		if (data.length >= instance.options.count) {
			instance.send(data);
			data = [];
			setTimeout2(instance.id, () => instance.status(''), 500);
		} else
			setTimeout2(instance.id, () => instance.status('{0}x pending / {1} limit'.format(data.length, instance.options.count), 'red'), 500);
	});

	instance.on('click', function() {
		if (!data.length)
			return;
		instance.send(data);
		data = [];
		setTimeout2(instance.id, () => instance.status(''), 500);
	});
};