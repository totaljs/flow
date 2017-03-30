exports.id = 'messengerrawdata';
exports.title = 'Messenger: Raw Data';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.group = 'Inputs';
exports.color = '#F6BB42';
exports.output = 1;
exports.icon = 'braille';
exports.readme = `# Total.js Messenger: Raw Data

This component evaluates data when is created a new message in Total.js messenger.

- message repository contains \`client\` and \`controller\` instance,
- output contains a raw data of message \`Object\``;

exports.install = function(instance) {

	var can;

	instance.custom.message = function(controller, client, message) {
		instance.send(message).set('client', client).set('controller', controller);
	};

	instance.on('close', () => OFF('messenger.data', instance.custom.message));
	ON('messenger.data', instance.custom.message);

	instance.reconfigure = function() {
		can = F.global.sendmessage ? true : false;
		instance.status(can ? '' : 'Messenger not found', can ? undefined : 'red');
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};