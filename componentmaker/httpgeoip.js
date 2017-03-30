exports.id = 'httpgeoip';
exports.title = 'HTTP GeoIP';
exports.group = 'HTTP';
exports.color = '#5D9CEC';
exports.icon = 'map-marker';
exports.input = true;
exports.output = 1;
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.readme = `# HTTP GeoIP

The component obtains locality according to the IP address. Received data has to contain \`data.ip\` field with IP address. If the component will obtain Geo informations then it extends a current data object about a new field \`geoip\` and sends all data next.

\`\`\`javascript
response.geoip;     // Object { country_code: 'SK', country_name: 'Slovakia', city: '', region_code: '', region_name: '', zip_code: '', time_zone: '', latitude: 51.2993, longitude: 9.491 }
\`\`\``;

exports.install = function(instance) {

	const FLAGS = ['dnscache', 'get'];
	var cache = {};

	instance.on('data', function(response) {

		if (!response.data)
			return;

		var ip = response.data.ip;

		if (cache[ip]) {
			response.data.geoip = cache[ip];
			instance.send(response.data);
			return;
		}

		ip && U.request('http://freegeoip.net/json/' + ip, FLAGS, function(err, res, status) {

			if (err) {
				instance.error(err);
				return;
			}

			if (status !== 200)
				return;

			var data = res.parseJSON();
			if (data) {
				response.data.geoip = cache[ip] = data;
				instance.send(response.data);
			}
		});
	});

	instance.on('service', (counter) => counter % 30 === 0 && (cache = {}));
};