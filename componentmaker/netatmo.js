exports.id = 'netatmo';
exports.title = 'Netatmo';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.group = 'Services';
exports.color = '#FC6E51';
exports.input = true;
exports.output = 1;
exports.options = {};
exports.readme = `# Netatmo

Receives data from __Netatmo Weather Station__. Each station has to be authorized first. __IMPORTANT__: \`input\` has to be MAC address from your Netatmo station.

### How to obtain MAC address?

Open https://my.netatmo.com/app/station and click on the settings. There is your MAC address. For example \`70:ee:50:12:95:f2\`.

### Output example

\`\`\`json
[
  {
    "altitude": 362,
    "lat": 19.158087,
    "lng": 48.728146,
    "name": "mSirkovci",
    "humidity": 51,
    "co2": 1671,
    "temperature": 23.3,
    "temperaturetrend": "stable",
    "noise": 43,
    "pressure": 1017,
    "pressuretrend": "up",
    "indoor": [],
    "outdoor": [
      {
        "temperaturetrend": "up",
        "temperature": 3.8,
        "humidity": 89,
        "temperaturemin": 3.4,
        "temperaturemax": 15.2,
        "battery": 72,
        "name": "Module"
      }
    ]
  }
]
\`\`\``;

exports.html = `<div class="padding">
	<br />
	<div class="row">
		<div class="col-md-4 m col-md-offset-4">
			<a href="javascript:void(0)" class="button netatmoautorizationlink" target="_blank" style="width:100%"><i class="fa fa-cloud mr5"></i>@(<b>Authorize Netatmo</b> wheater station)</a>
		</div>
	</div>
	<div class="row">
		<div class="col-md-8 col-md-offset-2 m">
			<div class="help nmt ui-center">@(Click on the button if you didn't authorize your wheater station. You will be redirected into the secured area of Netatmo wheater station.)</div>
		</div>
	</div>
	<br />
</div><script>
ON('open.netatmo', function(component) {
	setTimeout(function() {
		$('.netatmoautorizationlink').attr('href', '/$netatmo/{0}/'.format(component.id));
	});
});
$(document).on('click', '.netatmoautorizationlink', function() {
	SET('common.form', '');
});
</script>`;

exports.install = function(instance) {

	instance.custom.reconfigure = function() {

		// A temporary variable for token refreshing
		instance.custom.errors = {};

		NOSQL('netatmo').find().first().where('id', instance.id).callback(function(err, station) {
			if (!station || !station.token)
				instance.status('Not authorized', 'red');
			else
				instance.status();
		});
	};

	instance.custom.refresh = function(mac) {
		NOSQL('netatmo').find().first().where('id', instance.id).callback(function(err, station) {
			RESTBuilder.make(function(builder) {
				var data = {};
				data.access_token = station.token;
				data.device_id = mac;
				builder.url('https://api.netatmo.com/api/getstationsdata');
				builder.urlencoded(data);
				builder.post();
				builder.exec(function(err, data) {
					if (data.error) {
						if (!instance.custom.errors[mac]) {
							instance.custom.errors[mac] = true;
							instance.custom.reauthorize(mac, station, () => instance.custom.refresh(mac));
						}
						return;
					}

					data.body && data.body.devices && instance.send(instance.custom.prepare(data.body.devices));
				});
			});
		});
	};

	instance.custom.reauthorize = function(mac, station, callback) {
		U.request('https://netatmo.totaljs.com/netatmo/refresh/?id={0}&url={1}&token={2}'.format(station.id, encodeURIComponent(station.hostname), encodeURIComponent(station.refresh)), ['get'], '', function(err, response) {
			var data = JSON.parse(response);
			if (data.refresh) {
				var options = { token: data.token, refresh: data.refresh, dateupdated: F.datetime };
				NOSQL('netatmo').modify(options).where('id', instance.id).callback(function() {
					delete instance.custom.errors[mac];
					callback && callback();
				});
			} else
				callback = null;
		});
	};

	instance.custom.prepare = function(data) {
		var arr = [];
		for (var i = 0, length = data.length; i < length; i++) {

			var item = data[i];
			var obj = {};

			obj.altitude = item.place.altitude;
			obj.lat = item.place.location[0];
			obj.lng = item.place.location[1];
			obj.name = item.station_name;
			obj.humidity = item.dashboard_data.Humidity;
			obj.co2 = item.dashboard_data.CO2;
			obj.temperature = item.dashboard_data.Temperature;
			obj.temperaturetrend = item.dashboard_data.temp_trend;
			obj.noise = item.dashboard_data.Noise;
			obj.pressure = item.dashboard_data.Pressure;
			obj.pressuretrend = item.dashboard_data.pressure_trend;
			obj.indoor = [];
			obj.outdoor = [];
			arr.push(obj);

			for (var j = 0, jl = item.modules.length; j < jl; j++) {
				var m = item.modules[j].dashboard_data;
				var sub;
				switch (item.modules[j].type) {
					case 'NAModule1':
						// outdoor
						sub = {};
						sub.temperaturetrend = m.temp_trend;
						sub.temperature = m.Temperature;
						sub.humidity = m.Humidity;
						sub.temperaturemin = m.min_temp;
						sub.temperaturemax = m.max_temp;
						sub.battery = item.modules[j].battery_percent;
						sub.name = item.modules[j].module_name;
						obj.outdoor.push(sub);
						break;
					case 'NAModule4':
						// indoor
						sub = {};
						sub.temperaturetrend = m.temp_trend;
						sub.temperature = m.Temperature;
						sub.humidity = m.Humidity;
						sub.temperaturemin = m.min_temp;
						sub.temperaturemax = m.max_temp;
						sub.battery = item.modules[j].battery_percent;
						sub.name = item.modules[j].module_name;
						obj.indoor.push(sub);
						break;
				}
			}
		}

		return arr;
	};

	instance.custom.reconfigure();

	instance.on('data', function(response) {
		response.data && typeof(response.data) === 'string' && instance.custom.refresh(response.data);
	});

	instance.on('options', instance.custom.reconfigure);
};

F.route('/$netatmo/{id}/', netatmo, ['id:netatmo']);
F.route('/$netatmo/', netatmo_process, ['id:netatmo']);

exports.uninstall = function() {
	UNINSTALL('web', 'id:netatmo');
};

function netatmo(id) {
	this.redirect('https://netatmo.totaljs.com/?id={0}&url={1}'.format(id, encodeURIComponent(this.hostname('/$netatmo/'))));
}

function netatmo_process() {
	var options = { id: this.query.id, token: this.query.token, refresh: this.query.refresh, dateupdated: F.datetime, hostname: this.hostname('/$netatmo/') };
	NOSQL('netatmo').update(options, options).where('id', options.id);
	this.content('<html><body>Done. You can close this page.<script>window.close()</script></body></html>', 'text/html');
}