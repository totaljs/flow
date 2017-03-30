exports.id = 'modified';
exports.title = 'Modified';
exports.group = 'Common';
exports.color = '#656D78';
exports.input = true;
exports.output = 1;
exports.author = 'Peter Širka';
exports.icon = 'refresh';
exports.readme = `# Modified

This component compares a new value with a previous value. If the values are different then sends new data to next component.`;

exports.install = function(instance) {
	var backup = undefined;
	var counter = 0;
	instance.on('data', function(response) {
		var data = response.data;

		if (data instanceof Buffer)
			data = data.toString('base64');
		else if (typeof(data) === 'object' || data instanceof Date)
			data = JSON.stringify(data);

		if (backup !== data) {
			backup = data;
			instance.send(response);
		} else {
			counter++;
			instance.status('Not modified: {0}x'.format(counter));
		}
	});
};