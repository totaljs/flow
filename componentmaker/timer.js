exports.id = 'timer';
exports.title = 'Timer';
exports.group = 'Inputs';
exports.color = '#F6BB42';
exports.output = 1;
exports.click = true;
exports.author = 'Peter Širka';
exports.icon = 'clock-o';
exports.options = { interval: 0 };

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="interval" data-placeholder="@(1000)" data-increment="true" data-jc-type="number" data-required="true">@(Interval in milliseconds)</div>
		</div>
	</div>
	<section>
		<label><i class="fa fa-random"></i>@(Output data)</label>
		<div class="padding">
			<div data-jc="dropdown" data-jc-path="datatype" data-options=";String|string;Integer|integer;Float|float;Boolean|boolean;Date|date;Object|object;Base64 as Buffer|buffer" class="m">@(Data type (String by default))</div>
			<div data-jc="textbox" data-jc-path="data" data-placeholder="@(e.g. Hello world or { hello: 'world'} or ['hello', 'world'])">@(Data)</div>
		</div>
	</section>
</div>`;

exports.readme = `# Timer

Timer will trigger flow in the given interval (in milliseconds). You can optionally define a data-type of the output and the data.`;

exports.install = function(instance) {

	var value;
	var id;

	instance.on('click', () => value && instance.send(value));

	instance.reconfigure = function() {
		var options = instance.options;

		if (!options.interval) {
			instance.status('Not configured', 'red');
			return;
		}

		value = null;
		switch (options.datatype) {
			case 'string':
				value = options.data;
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
		clearInterval(id);
		options.interval && (id = setInterval(() => instance.send(value), options.interval));
		instance.status('');
	};

	instance.on('close', () => clearInterval(id));
	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};