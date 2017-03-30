exports.id = 'messengerusers';
exports.title = 'Messenger: Users';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.group = 'Inputs';
exports.color = '#F6BB42';
exports.output = ['#8CC152', '#DA4453'];
exports.icon = 'users';
exports.readme = `# Total.js Messenger: Users

This component evaluates user data when the user is online (green output) / offline (red output).

- output contains a raw data of the user`;

exports.install = function(instance) {

	var can;

	instance.custom.online = function(controller, client) {
		instance.send(0, client.user).set('client', client).set('controller', controller);
	};

	instance.custom.offline = function(controller, client) {
		instance.send(1, client.user).set('client', client).set('controller', controller);
	};

	instance.on('close', function() {
		OFF('messenger.open', instance.custom.online);
		OFF('messenger.close', instance.custom.offline);
	});

	ON('messenger.open', instance.custom.online);
	ON('messenger.close', instance.custom.offline);

	instance.reconfigure = function() {
		can = F.global.sendmessage ? true : false;
		instance.status(can ? '' : 'Messenger not found', can ? undefined : 'red');
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};