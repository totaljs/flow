exports.id = 'trigger';
exports.title = 'Trigger';
exports.group = 'Inputs';
exports.color = '#F6BB42';
exports.click = true;
exports.output =  1;
exports.version = '1.0.0';
exports.author = 'Martin Smola';

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="datatype" data-options=";String|string;Integer|integer;Float|float;Boolean|boolean;Date|date;Object|object;Base64 as Buffer|buffer" class="m">@(Data type (String by default))</div>
	<div data-jc="textbox" data-jc-path="data" data-placeholder="@(e.g. Hello world or { hello: 'world'} or ['hello', 'world']))">@(Data)</div>
</div>`;

exports.readme = `# Trigger

- Clicking on the component starts the chain
- Settings allows to set a data-type and a value`;

exports.install = function(instance) {

	var value;

	instance.on('click', () => instance.send(value));

	instance.reconfigure = function() {
		var options = instance.options;
		value = null;
		switch (options.datatype) {
			case 'string':
				value = '' + options.data;
				break;
			case 'integer':
				value = U.parseInt(options.data);
				break;
			case 'float':
				value = U.parseFloat(options.data);
				break;
			case 'date':
				var num = U.parseInt(options.data);
				value = num ? new Date(num) : options.data.parseDate();
				break;
			case 'object':
				try {
					value = (new Function('return ' + options.data))();
				} catch (e) {
					instance.error(e);
				}
				break;
			case 'boolean':
				value = options.data.parseBoolean();
				break;
			case 'buffer':
				try {
					value = U.createBuffer(options.data);
				} catch (e) {
					instance.error(e);
				}
				break;
		}
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};