exports.id = 'mqttserver';
exports.title = 'MQTT server';
exports.group = 'MQTT';
exports.color = '#656D78';
exports.version = '1.0.0';
exports.icon = 'clock-o';
exports.input = false;
exports.output = 0;
exports.author = 'Martin Smola';
exports.options = {};
exports.npm = ['mosca'];

exports.html = `<div class="padding">
	<section>
		<label><i class="fa fa-exchange"></i>@(MQTT server (Mosca))</label>	
		<!--<div class="padding npb">
			<div class="row">
				<div class="col-md-6">
					<div data-jc="textbox" data-jc-path="host" data-placeholder="127.0.0.1" class="m">Hostname or IP address</div>
				</div>
				<div class="col-md-6">
					<div data-jc="textbox" data-jc-path="port" data-placeholder="1883" class="m">Port</div>
				</div>
			</div>
		</div>-->
	</section>
</div>`;

exports.readme = `
# MQTT Broker


`;

var mosca = require('mosca');

exports.install = function(instance) {

	var server;

	instance.custom.reconfigure = function(options, old_options) {

		if (server && options !== old_options)
			server.close(() => instance.custom.start_server());
		else
			instance.custom.start_server();
	};

	instance.on('close', server.close);
	instance.on('options', instance.custom.reconfigure);

	instance.custom.reconfigure();

	instance.custom.start_server = function(){
		var options = instance.options;
		 
		var settings = {
		  port: options.port || 1883,
		  persistence: mosca.persistence.Memory
		};
		 
		var server = new mosca.Server(settings, function() {
		  instance.status('Running...')
		});
	};
};
