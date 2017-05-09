exports.id = 'mqttsubscribe';
exports.title = 'MQTT subscribe';
exports.group = 'MQTT';
exports.color = '#656D78';
exports.version = '1.0.0';
exports.icon = 'clock-o';
exports.output = 1;
exports.author = 'Martin Smola';
exports.options = {};
exports.status = { text: 'Press APPLY', color: 'red' };

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="broker" data-source="mqttconfig.brokers" class="m" data-required="true">@(Select a broker)</div>
	<div data-jc="textbox" data-jc-path="topic" data-placeholder="hello/world" data-required="true" class="m">@(Topic)</div>
	<div data-jc="dropdown" data-jc-path="qos" data-options=";0;1;2" class="m">@(QoS)</div>
</div>
<script>
	ON('open.mqttsubscribe', function() {
		TRIGGER('mqtt.brokers', 'mqttconfig.brokers');
	});
</script>`;

exports.readme = `
# MQTT subscribe
`;

exports.install = function(instance) {

	var added = false;
	var subscribed = false;
	var isWildcard = false;

	var MESSAGE = {
		topic:''
	};
	instance.custom.reconfigure = function(o, old_options){

		if (instance.options.broker && instance.options.topic) {
			isWildcard = instance.options.topic[instance.options.topic.length - 1] === '#';

			if (!added)
				MQTT.add(instance.options.broker);

			if (!subscribed)
				MQTT.subscribe(instance.options.broker, instance.id, instance.options.topic);

			if (old_options && (instance.options.topic !== old_options.topic || instance.options.qos !== old_options.qos)) {
				MQTT.unsubscribe(instance.options.broker, instance.id, old_options.topic);
				MQTT.subscribe(instance.options.broker, instance.id, instance.options.topic, instance.options.qos);
			}
			added = true;
			subscribed = true;
			return;
		}

		instance.status('Not configured', 'red');
	};

	instance.on('options', instance.custom.reconfigure);

	instance.on('close', function(){

		MQTT.unsubscribe(instance.options.broker, instance.id, instance.options.topic);
		MQTT.remove(instance.options.broker, instance.id);
		subscribed = false;
		added = false;

		OFF('mqtt.brokers.message', message);
		OFF('mqtt.brokers.connected', connected);
		OFF('mqtt.brokers.connecting', connecting);
		OFF('mqtt.brokers.disconnected', disconnected);
		OFF('mqtt.brokers.connectionfailed', connectionfailed);
		OFF('mqtt.brokers.error', error);
	});

	function message(brokerid, topic, message) {
		if (brokerid !== instance.options.broker)
			return;

		if (isWildcard) {
			if (!topic.startsWith(instance.options.topic.substring(0, instance.options.topic.length - 1)))
				return;
		} else {
			if(instance.options.topic !== topic)
				return;
		}
		MESSAGE.topic = topic;
		MESSAGE.data = message; 
		instance.send(MESSAGE);
	};

	// re-subscibe on reconnect
	function connected(brokerid){
		if (brokerid !== instance.options.broker)
			return;

		MQTT.subscribe(instance.options.broker, instance.id, instance.options.topic);
		instance.status('Connected', 'green');
	};

	function connecting(brokerid) {
		if (brokerid !== instance.options.broker)
			return;
		instance.status('Connecting', '#a6c3ff')
	};

	function disconnected(brokerid) {
		if (brokerid !== instance.options.broker)
			return;
		instance.status('Disconnected', 'red')
	};

	function connectionfailed(brokerid) {
		if (brokerid !== instance.options.broker)
			return;
		instance.status('Connection failed', 'red')
	};

	function error(brokerid, msg) {
		if (brokerid !== instance.options.broker)
			return;
		instance.status(msg, 'red')
	};

	ON('mqtt.brokers.message', message);
	ON('mqtt.brokers.connected', connected);
	ON('mqtt.brokers.connecting', connecting);
	ON('mqtt.brokers.disconnected', disconnected);
	ON('mqtt.brokers.connectionfailed', connectionfailed);
	ON('mqtt.brokers.error', error);

	instance.custom.reconfigure();
};