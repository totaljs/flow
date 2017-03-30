exports.id = 'uniqueinterval';
exports.title = 'Unique in interval';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.color = '#656D78';
exports.input = true;
exports.click = true;
exports.output = 1;
exports.options = { condition: '// A unique value for comparing e.g. unique value according to the country "next(value.country)"\nnext(value);', interval: '5 minutes' };
exports.readme = `# Unique in interval

This component filters unique data according to the unique data \`key\` (can be string, number or object) for a \`interval\`. Click on the instance will release an internal cache.`;

exports.html = `<div class="padding">
	<div class="row">
		<div class="col-md-3 m">
			<div data-jc="textbox" data-jc-path="interval" data-placeholder="@(5 minutes)" data-maxlength="20" data-align="center" data-required="true" data-icon="fa-clock-o">@(Interval)</div>
		</div>
	</div>
	<div data-jc="codemirror" data-jc-path="condition" data-height="200" data-required="true">@(Unique data key)</div>
</div>`;

exports.install = function(instance) {

	var fn = null;
	var cache = {};

	instance.on('data', function(response) {
		fn && fn(response.data, function(err, value) {
			var key = JSON.stringify(value);
			var val = cache[key];
			var now = new Date();
			if (val == null || val < now) {
				cache[key] = now.add(instance.options.interval);
				instance.send(response);
			}
		});
	});

	instance.reconfigure = function() {
		try {
			instance.options.condition && (fn = SCRIPT(instance.options.condition));
			instance.status(instance.options.interval);
		} catch(e) {
			fn = null;
		}
	};

	instance.on('click', function() {
		cache = {};
	});

	instance.on('service', function(counter) {
		counter % 5 === 0 && Object.keys(cache).forEach(function(key) {
			if (cache[key] < F.datetime)
				delete cache[key];
		});
	});

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};