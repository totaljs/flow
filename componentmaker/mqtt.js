exports.id = 'mqtt';
exports.title = 'MQTT broker';
exports.group = 'MQTT';
exports.color = '#656D78';
exports.version = '1.0.0';
exports.icon = 'clock-o';
exports.input = false;
exports.output = 0;
exports.author = 'Martin Smola';
exports.options = {};
exports.npm = ['mqtt'];

exports.html = `<div class="padding">
	<section>
		<label><i class="fa fa-exchange"></i>@(Broker)</label>
		<div class="padding npb">
			<div class="row">
				<div class="col-md-6">
					<div data-jc="textbox" data-jc-path="host" data-placeholder="test.mosquitto.org" class="m">Hostname or IP address</div>
				</div>
				<div class="col-md-6">
					<div data-jc="textbox" data-jc-path="port" data-placeholder="1883" class="m">Port</div>
				</div>
			</div>
			<div class="row">
				<div class="col-md-6">
					<div data-jc="textbox" data-jc-path="username" class="m">Username</div>
				</div>
				<div class="col-md-6">
					<div data-jc="textbox" data-jc-path="password" class="m">Password</div>
				</div>
			</div>
		</div>
	</section>
</div>`;

exports.readme = `
# MQTT Broker


`;

var MQTT_BROKERS = [];
global.MQTT = {};

exports.install = function(instance) {

	var broker;

	instance.custom.reconfigure = function(o, old_options) {

		var options = instance.options;

		if (!options.host || !options.port) {
			broker && instance.custom.removeBroker();
			return;
		}

		options.id = options.host + ':' + options.port;

		if (broker)
			JSON.stringify(options) !== JSON.stringify(old_options) && broker.reconfigure(options);
		else
			instance.custom.createBroker();
	};

	instance.custom.createBroker = function() {
		broker = new Broker(instance.options);
		MQTT_BROKERS.push(broker);
	};

	instance.custom.removeBroker = function() {
		broker && broker.close(function() {
			MQTT_BROKERS = MQTT_BROKERS.remove('id', instance.options.id);
		});
	};

	instance.on('close', instance.custom.removeBroker);
	instance.on('options', instance.custom.reconfigure);
	instance.custom.reconfigure();

	ON('mqtt.brokers.connecting', function(brokerid){
		if (brokerid !== instance.options.id)
			return;
		instance.status('Connecting', '#a6c3ff');
	});
	ON('mqtt.brokers.connected', function(brokerid){
		if (brokerid !== instance.options.id)
			return;
		instance.status('Connected', 'green');
	});
	ON('mqtt.brokers.disconnected', function(brokerid){
		if (brokerid !== instance.options.id)
			return;
		instance.status('Disconnected', 'red');
	});
	ON('mqtt.brokers.connectionfailed', function(brokerid){
		if (brokerid !== instance.options.id)
			return;
		instance.status('Connection failed', 'red');
	});
};

FLOW.trigger('mqtt.brokers', function(next) {
	var brokers = [''];
	MQTT_BROKERS.forEach(n => brokers.push(n.id));
	next(brokers);
});

MQTT.add = function(brokerid, componentid) {
	var broker = MQTT_BROKERS.findItem('id', brokerid);

	if (broker) {
		broker.add(componentid);
		return true;
	}

	return false;
};

MQTT.remove = function(brokerid, componentid) {
	var broker = MQTT_BROKERS.findItem('id', brokerid);
	broker && broker.remove(componentid);
};

MQTT.publish = function(brokerid, topic, data, options) {
	var broker = MQTT_BROKERS.findItem('id', brokerid);
	if (broker)
		broker.publish(topic, data, options);
	else
		EMIT('mqtt.brokers.error', brokerid, 'No such broker');
};

MQTT.subscribe = function(brokerid, componentid, topic, qos) {
	var broker = MQTT_BROKERS.findItem('id', brokerid);
	broker && broker.subscribe(componentid, topic, qos);
};

MQTT.unsubscribe = function(brokerid, componentid, topic, qos) {
	var broker = MQTT_BROKERS.findItem('id', brokerid);
	broker && broker.unsubscribe(componentid, topic);
};

/*

	https://github.com/mqttjs/MQTT.js/blob/master/examples/client/secure-client.js

*/

/*
	TODO

	- add `birth` and `last will and testament` messages
	- add options to self.client.connect(broker [,options]); - credentials, certificate etc.


*/
var mqtt = require('mqtt');

function Broker(options) {
	var self = this;

	if (!options.host || !options.port)
		return false;

	self.connecting = false;
	self.connected = false;
	self.closing = false;
	self.components = [];
	self.subscribtions = {};
	self.id = options.id;
	self.options = options;
	return self;
}

Broker.prototype.connect = function() {

	var self = this;
	if (self.connected || self.connecting) {
		EMIT('mqtt.brokers.' + self.connected ? 'connected' : 'connecting', self.id);
		return;
	}

	self.connecting = true;

	var broker = self.options.secure ? 'mqtts://' : 'mqtt://' + self.options.host + ':' + self.options.port;

	EMIT('mqtt.brokers.connecting', self.id);

	self.client = mqtt.connect(broker);
	self.client.on('connect', function() {
		self.connecting = false;
		self.connected = true;
		EMIT('mqtt.brokers.connected', self.id);
	});

	self.client.on('reconnect', () => EMIT('mqtt.brokers.connecting', self.id));
	self.client.on('message', function(topic, message) {
		message = message.toString();
		if (message[0] === '{') {
			TRY(function() {
				message = JSON.parse(message);
			}, () => FLOW.debug('MQTT: Error parsing data', message));
		}
		EMIT('mqtt.brokers.message', self.id, topic, message);
	});

	self.client.on('close', function() {
		if (self.connected) {
			self.connected = false;
			EMIT('mqtt.brokers.disconnected', self.id);
		} else if (self.connecting) {
			EMIT('mqtt.brokers.connectionfailed', self.id);
		}
	});

	self.client.on('error', function(err) {
		/*
		node === unused
		if (node.connecting) {
			node.client.end();
			node.connecting = false;
			EMIT('mqtt.brokers.connectionfailed', self.id);
		}
		*/
		console.log('ERROR', broker, err);
	});

};

Broker.prototype.disconnect = function() {
	var self = this;
	if (!self.closing && !self.components.length && self.client && self.client.connected)
		self.client.end();
};

Broker.prototype.reconfigure = function(options) {
	var self = this;
	if (self.closing)
		return;

	self.options = options;

	if (self.connected) {
		self.disconnect();
		self.connect();
	}
};

Broker.prototype.subscribe = function(componentid, topic, qos) {
	var self = this;
	self.subscribtions[topic] = self.subscribtions[topic] || [];
	if (self.subscribtions[topic].indexOf(componentid) > -1)
		return;
	self.client.subscribe(topic, qos || 0);
	self.subscribtions[topic].push(componentid);
};

Broker.prototype.unsubscribe = function(componentid, topic) {
	var self = this;
	var subscription = self.subscribtions[topic];
	if (subscription) {
		subscription = subscription.remove(componentid);
		self.client.connected && !subscription.length && self.client.unsubscribe(topic);
	}
};

Broker.prototype.publish = function(topic, data, options) {
	var self = this;

	if (!self.connected || !data)
		return;

	if (typeof(data) === 'object') {
		options.qos = parseInt(data.qos || options.qos);
		options.retain = data.retain || options.retain;
		topic = data.topic || topic;
		data.payload && (data = JSON.stringify(data.payload));
	}

	if (options.qos !== 0 || options.qos !== 1 || options.qos !== 2)
		options.qos = null;

	if (typeof(data) !== 'string')
		data = JSON.stringify(data);

	self.client.publish(topic, data, options);
};

Broker.prototype.close = function(callback) {
	var self = this;
	self.closing = true;

	if (self.connected) {
		self.client.once('close', () => callback());
		self.client.end();
	} else if (self.connecting) {
		self.client.end();
		callback();
	} else
		callback();

	self.client.removeAllListeners();
};

Broker.prototype.add = function(componentid) {
	var self = this;
	self.components.indexOf(componentid) === -1 && self.components.push(componentid);
	self.connect();
};

Broker.prototype.remove = function(componentid) {
	var self = this;
	self.components = self.components.remove(componentid);
	self.disconnect();
};
