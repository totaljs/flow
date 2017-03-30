exports.id = 'groupanalytics';
exports.title = 'Group Analytics';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.group = 'Databases';
exports.color = '#D770AD';
exports.input = true;
exports.output = 1;
exports.options = { fn: 'next({ value: value.count, group: value.brand });', format: '{0}x', decimals: 2 };
exports.readme = `# Group Analytics

Creates a group analytics automatically according a value and group. The value must be a \`Number\` and group must be a \`String\`. The output is \`Object\`:

\`\`\`javascript
{
	Audi: {
		count: 4,          // {Number} count of analyzed values in the hour
		decimals: 0,       // {Number} count of decimals
		format: '{0}x',    // {String} custom defined format, "{0}" will be a value
		period: 'hourly'   // {String} period "hourly" or "daily"
		previous: 45,      // {Number} previous calculated value
		raw: 50,           // {Number} last raw value
		type: 'sum',       // {String} type of analytics
		value: 50,         // {Number} last calculated value
	},
	BMW: {
		count: 2,          // {Number} count of analyzed values in the hour
		decimals: 0,       // {Number} count of decimals
		format: '{0}x',    // {String} custom defined format, "{0}" will be a value
		period: 'hourly'   // {String} period "hourly" or "daily"
		previous: 15,      // {Number} previous calculated value
		raw: 30,           // {Number} last raw value
		type: 'sum',       // {String} type of analytics
		value: 30,         // {Number} last calculated value
	}
}
\`\`\``;

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="type" class="m" data-options=";@(Hourly: Sum values)|sum;@(Hourly: A maximum value)|max;@(Hourly: A minimum value)|min;@(Hourly: An average value)|avg;@(Hourly: An average (median) value)|median;@(Daily: Sum values)|Dsum;@(Daily: A maximum value)|Dmax;@(Daily: A minimum value)|Dmin;@(Daily: An average value)|Davg;@(Daily: An average (median) value)|Dmedian" data-required="true">@(Type)</div>
	<div data-jc="codemirror" data-jc-path="fn" data-type="javascript" class="m">@(Analyzator)</div>
	<div class="row">
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="format" data-placeholder="@(e.g. {0}x)" data-maxlength="10" data-align="center">@(Format)</div>
		</div>
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="decimals" data-maxlength="10" data-align="center" data-increment="true" data-jc-type="number">@(Decimals)</div>
		</div>
	</div>
</div>`;

exports.install = function(instance) {

	const Fs = require('fs');

	var fn = null;
	var dbname = 'groupanalytics_' + instance.id;
	var temporary = F.path.databases(dbname + '.json');
	var cache = {};
	var current = {};

	instance.on('close', function() {
		Fs.unlink(temporary, NOOP);
	});

	instance.on('data', function(response) {
		fn && fn(response.data, function(err, value) {

			if (err || value == null || value.value == null || !value.group)
				return;

			var val = value.value;
			var group = value.group;

			var type = typeof(val);
			if (type === 'string') {
				val = val.parseFloat2();
				type = 'number';
			}

			if (isNaN(val))
				return;

			cache.$datetime = F.datetime;
			!cache[group] && (cache[group] = { count: 0 });

			var atmp = cache[group];
			atmp.count++;
			atmp.raw = val;
			atmp.datetime = F.datetime;

			switch (instance.options.type) {
				case 'max':
				case 'Dmax':
					atmp.number = atmp.number == null ? val : Math.max(atmp.number, val);
					break;
				case 'min':
				case 'Dmin':
					atmp.number = atmp.number == null ? val : Math.min(atmp.number, val);
					break;
				case 'sum':
				case 'Dsum':
					atmp.number = atmp.number == null ? val : atmp.number + val;
					break;
				case 'avg':
				case 'Davg':
					!atmp.avg && (atmp.avg = { count: 0, sum: 0 });
					atmp.avg.count++;
					atmp.avg.sum += val;
					atmp.number = atmp.avg.sum / atmp.avg.count;
					break;
				case 'median':
				case 'Dmedian':
					!atmp.median && (atmp.median = []);
					atmp.median.push(val);
					atmp.median.sort((a, b) => a - b);
					var half = Math.floor(atmp.median.length / 2);
					atmp.number = atmp.median.length % 2 ? atmp.median[half] : (atmp.median[half - 1] + atmp.median[half]) / 2.0;
					break;
			}

			!current[group] && (current[group] = {});
			var btmp = current[group];
			btmp.previous = btmp.value;
			btmp.value = atmp.number;
			btmp.raw = atmp.raw;
			btmp.format = instance.options.format;
			btmp.type = instance.options.type[0] === 'D' ? instance.options.type.substring(1) : instance.options.type;
			btmp.count = atmp.count;
			btmp.period = instance.options.type[0] === 'D' ? 'daily' : 'hourly';
			btmp.decimals = instance.options.decimals;
			btmp.datetime = F.datetime;
			instance.connections && instance.send(current);
			EMIT('flow.groupanalytics', instance, current);
		});
	});

	instance.on('service', function() {
		if (fn) {
			instance.custom.save();
			instance.custom.save_temporary();
		}
	});

	instance.custom.save_temporary = function() {
		Fs.writeFile(temporary, JSON.stringify(cache), NOOP);
	};

	instance.custom.current = function() {
		return current;
	};

	instance.custom.save = function() {

		if (!cache.$datetime)
			return;

		if (instance.options.type[0] === 'D') {
			if (cache.$datetime.getDate() === F.datetime.getDate())
				return;
		} else {
			if (cache.$datetime.getHours() === F.datetime.getHours())
				return;
		}

		var keys = Object.keys(cache);
		var all = [];
		var dt = cache.$datetime;
		var id = +dt.format('yyyyMMddHH');
		var w = +dt.format('w');

		keys.forEach(function(key) {

			if (key === '$datetime')
				return;

			all.push(key);

			var item = cache[key];
			var doc = {};

			doc.id = id;
			doc.year = dt.getFullYear();
			doc.month = dt.getMonth() + 1;
			doc.day = dt.getDate();
			doc.hour = dt.getHours();
			doc.week = w;
			doc.count = item.count;
			doc.value = item.number;
			doc.type = instance.options.type[0] === 'D' ? instance.options.type.substring(1) : instance.options.type;
			doc.period = instance.options.type[0] === 'D' ? 'daily' : 'hourly';
			doc.format = instance.options.format;
			doc.group = key;
			doc.datecreated = F.datetime;

			NOSQL(dbname).update(doc, doc).where('id', doc.id).where('group', doc.group);

			item.count = 0;
			item.number = null;

			switch (instance.options.type) {
				case 'median':
				case 'Dmedian':
					item.median = [];
					break;
				case 'avg':
				case 'Davg':
					item.avg.count = 0;
					item.avg.sum = 0;
					break;
			}
		});

		cache.$datetime = F.datetime;
		NOSQL(dbname).meta('groups', all);
		instance.custom.save_temporary();
	};

	instance.custom.reconfigure = function() {
		var options = instance.options;

		if (!options.type) {
			instance.status('Not configured', 'red');
			fn = null;
			return;
		}

		fn = SCRIPT(options.fn);
		instance.status('');
		instance.custom.init && instance.custom.init();
	};

	instance.on('options', instance.custom.reconfigure);
	instance.custom.stats = callback => callback(null, NOSQL(dbname));
	instance.custom.groups = callback => callback(null, NOSQL(dbname).meta('groups'));
	instance.custom.reconfigure();

	instance.custom.init = function() {
		instance.custom.init = null;
		Fs.readFile(temporary, function(err, data) {
			if (err)
				return;
			var dt = cache.$datetime || F.datetime;
			var tmp = data.toString('utf8').parseJSON(true);
			if (tmp && tmp.$datetime) {
				cache = tmp;
				if (instance.options.type[0] === 'D')
					cache.$datetime.getDate() !== dt.getDate() && instance.custom.save();
				else
					cache.$datetime.getHours() !== dt.getHours() && instance.custom.save();
			} else
				cache.$datetime = F.datetime;
		});
	};
};