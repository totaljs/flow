exports.id = 'schema';
exports.title = 'Schema';
exports.group = 'Common';
exports.color = '#656D78';
exports.input = true;
exports.output = ['#8CC152', '#DA4453'];
exports.author = 'Peter Širka';
exports.icon = 'code';
exports.options = {};

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="operation" data-required="true" data-source="schemaoperations" data-empty="" class="m">@(Perform operation)</div>
</div><script>
TRIGGER('schemacodelist', 'schemaoperations');
</script>`;

exports.readme = `# Schema

Prepares data according to the schema.

- \`green\` without error
- \`red\` with error`

exports.install = function(instance) {

	var can = false;
	var method = null;
	var type = null;
	var name = null;

	instance.on('data', function(response) {
		if (!can || !method)
			return;
		if (type) {
			method(type, response.data, function(err, response) {
				if (err)
					instance.send(1, err);
				else
					instance.send(0, response);
			});
		} else {
			method(response.data, function(err, response) {
				if (err)
					instance.send(1, err);
				else
					instance.send(0, response);
			});
		}
	});

	instance.reconfigure = function() {
		can = instance.options.operation ? true : false;
		method = null;
		type = null;

		if (!can) {
			instance.status('Not configured', 'red');
			return;
		}

		var arr = instance.options.operation.split('|');
		var schema = GETSCHEMA(arr[0], arr[1]);

		if (!schema) {
			instance.status('Schema not found', 'red');
			return;
		}

		method = schema[arr[2]];
		type = arr[3];
		name = (arr[0] === 'default' ? '' : arr[0] + '/') + (arr[1] + ': ' + (arr[3] ? ('(' + arr[2] + ') ' + arr[3]) : arr[2]));
		instance.status(name);
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};

exports.uninstall = function() {
	FLOW.trigger('schemacodelist', null);
};

FLOW.trigger('schemacodelist', function(next) {
	var operations = [];
	EACHSCHEMA(function(group, name, schema) {
		Object.keys(schema.meta).forEach(function(key) {
			var arr = key.split('#');
			operations.push({ name: (group === 'default' ? '' : group + '/') + name + (arr.length > 1 ? ': (' + arr[0] + ') ' + arr[1] : ': ' + arr[0]), id: group + '|' + name + '|' + arr[0] + '|' + (arr[1] || '') });
		});
	});
	next(operations);
});