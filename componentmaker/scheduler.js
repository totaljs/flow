exports.id = 'scheduler';
exports.title = 'Scheduler';
exports.group = 'Inputs';
exports.color = '#F6BB42';
exports.output = 1;
exports.click = true;
exports.author = 'Peter Širka';
exports.icon = 'calendar';
exports.options = { time: '', repeat: '' };

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="time" data-placeholder="12:00" data-required="true">@(Time)</div>
			<div class="help">@(Time of the day the flow will be triggered.)</div>
		</div>
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="repeat" data-placeholder="1 week" data-required="true">@(Frequency)</div>
			<div class="help">@(Set to '1 week' for the scheduler to run every week)</div>
		</div>
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="start" data-placeholder="2 days" data-required="true">@(Start)</div>
			<div class="help">@(When to start this scheduler. e.g. for tommorow set to '1 day')</div>
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

exports.readme = `# Scheduler

Scheduler will trigger flow at the given time and date. You can optionally define a data-type of the output and the data.

In Frequency and Start fields following can be used:
- second(s)
- minute(s)
- hour(s)
- day(s)
- month(s)
- year(s)
- week(s)`;

exports.install = function(instance) {

	var value;
	var id;

	instance.on('click', () => value && instance.send(value));

	instance.reconfigure = function() {
		var options = instance.options;

		if (!options.time) {
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
		F.clearSchedule(id);
		id = F.schedule(options.start ? options.time.add(options.start) : options.time, options.repeat, () => instance.send(value));
		instance.status('');
	};

	instance.on('close', () => clearSchedule(id));
	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};