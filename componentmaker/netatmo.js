// Total.js Dashboard + Flow
const ID = '58d28424a467a310a58c53cd';
const SECRET = 'FY4VgGhbQa9NWbo8Bo2NLVG3XL7I';
const Qs = require('querystring');

exports.id = 'netatmo';
exports.title = 'Netatmo';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.group = 'Services';
exports.color = '#FC6E51';
exports.input = true;
exports.output = 1;
exports.options = { device: '' };
exports.readme = `# Netatmo

Receive station data from Netatmo Weather Station.

\`\`\`javascript
{

}
\`\`\``;

exports.html = `<div class="padding">
	<div class="m"><a href="javascript:void(0)" class="netatmoautorizationlink" target="_blank">@(Authorize my wheater station)</a></div>
	<div data-jc="textbox" data-jc-path="device" class="m" data-required="true">@(Device ID)</div>
</div><script>
ON('open.netatmo', function(component) {
	setTimeout(function() {
		$('.netatmoautorizationlink').attr('href', '/netatmo/{0}/'.format(component.id));
	});
});
</script>`;

exports.install = function(instance) {

	instance.custom.reconfigure = function() {
	};

	instance.getData = function() {
		NOSQL('netatmo').find().first().where('id', instance.id).callback(function(err, station) {

			if (!station)
				return;

			RESTBuilder.make(function(builder) {
				var data = {};
				data.access_token = station.token;
				data.device_id = instance.options.device;
				builder.url('https://api.netatmo.com/api/getstationsdata');
				builder.urlencoded(data);
				builder.post();
				builder.exec(function(err, data) {
					data.dashboard_data && self.send(data.dashboard_data);
				});
			});
		});
	};
};

F.route('/netatmo/{id}/', netatmo, ['id:netatmo']);
F.route('/netatmo/{id}/process/', netatmo_process, ['id:netatmo']);

exports.uninstall = function() {
	UNINSTALL('web', 'id:netatmo');
};

function netatmo(id) {
	var self = this;
	RESTBuilder.make(function(builder) {

		var data = {};
		data.client_id = ID;
		data.scope = 'read_station';
		data.state = U.GUID(10);
		data.redirect_uri = self.hostname('/netatmo/{0}/process/'.format(id));

		builder.redirect(false);
		builder.url('https://api.netatmo.com/oauth2/authorize?' + Qs.stringify(data));
		builder.urlencoded(data);
		builder.exec(function(err, data, response) {
			self.redirect(response.headers.location);
		});
	});
}

function netatmo_process(id) {
	var self = this;

	RESTBuilder.make(function(builder) {

		var data = {};
		data.grant_type = 'authorization_code';
		data.client_id = ID;
		data.client_secret = SECRET;
		data.code = self.query.code;
		data.redirect_uri = self.hostname('/netatmo/{id}/process/'.format(id));

		builder.url('https://api.netatmo.com/oauth2/token');
		builder.urlencoded(data);
		builder.exec(function(err, data) {
			var options = { id: id, device: '70:ee:50:12:95:f2', token: data.access_token, refresh_token: data.refresh_token, dateupdated: F.datetime };
			NOSQL('netatmo').update(options, options).where('id', id);
			self.plain('Done. You can close this page.');
		});
	});
}

/*
{
	"body": {
		"devices": [{
			"_id": "70:ee:50:12:95:f2",
			"cipher_id": "enc:16:L0NlzqN1HFnyvspjLk/dE3fXep8LnGVQ+sWmzmgqB44F3k+QcV/ebNM3dpHsa1VP",
			"last_status_store": 1491486039,
			"modules": [{
				"_id": "02:00:00:12:a2:02",
				"type": "NAModule1",
				"last_message": 1491486035,
				"last_seen": 1491485996,
				"dashboard_data": {
					"time_utc": 1491485996,
					"Temperature": 9.8,
					"temp_trend": "stable",
					"Humidity": 46,
					"date_max_temp": 1491470257,
					"date_min_temp": 1491431844,
					"min_temp": 7.9,
					"max_temp": 15.2
				},
				"data_type": ["Temperature", "Humidity"],
				"module_name": "Module",
				"last_setup": 1446044903,
				"battery_vp": 5322,
				"battery_percent": 72,
				"rf_status": 63,
				"firmware": 44
			}],
			"place": {
				"altitude": 362,
				"city": "Radvan",
				"country": "SK",
				"timezone": "Europe/Bratislava",
				"location": [19.158087, 48.728146]
			},
			"station_name": "mSirkovci",
			"type": "NAMain",
			"dashboard_data": {
				"AbsolutePressure": 969.9,
				"time_utc": 1491486000,
				"Noise": 39,
				"Temperature": 23,
				"temp_trend": "stable",
				"Humidity": 41,
				"Pressure": 1012.6,
				"pressure_trend": "up",
				"CO2": 459,
				"date_max_temp": 1491457576,
				"date_min_temp": 1491471490,
				"min_temp": 22.4,
				"max_temp": 23.7
			},
			"data_type": ["Temperature", "CO2", "Humidity", "Noise", "Pressure"],
			"co2_calibrating": false,
			"date_setup": 1446044903,
			"last_setup": 1446044903,
			"module_name": "mSirkovci",
			"firmware": 124,
			"last_upgrade": 1440392749,
			"wifi_status": 64
		}],
		"user": {
			"mail": "petersirka@gmail.com",
			"administrative": {
				"reg_locale": "sk-SK",
				"lang": "en-US",
				"unit": 0,
				"windunit": 0,
				"pressureunit": 0,
				"feel_like_algo": 0
			}
		}
	},
	"status": "ok",
	"time_exec": 0.03435492515564,
	"time_server": 1491486196
}
*/