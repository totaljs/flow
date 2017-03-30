exports.id = 'messengermessage';
exports.title = 'Messenger: Message';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.group = 'Inputs';
exports.color = '#F6BB42';
exports.output = 1;
exports.icon = 'comments-o';
exports.readme = `# Total.js Messenger: Message

This component evaluates data when is created a new message in Total.js messenger.

- message repository contains \`client\` and \`controller\` instance,
- output contains a raw data of message:
\`\`\`javascript
{
	body: 'MARKDOWN',
	type: 'channel', // or "user"
	target: { id: 'String', name: 'String', linker: 'String' } // "channel" or "user" instance
	from: { id: 'String', name: 'String', email: 'String', picture: 'String', ... },
	mobile: false, // Is message from a mobile device?
	robot: false, // Is message from a robot? (A message created manually on the server)
	edited: false, // Is message edited?
	users: ['IDUSER A', 'IDUSER B', '...'], // Users tagged in the message
	files: [{ name: 'My photo.jpg', url: '/download/3498349839843934.jpg' }] // Uploaded files
}
\`\`\``;

exports.install = function(instance) {

	var can;

	instance.custom.message = function(controller, client, message) {
		message = U.clone(message);
		message.from = client.user;
		message.type = client.threadtype;
		message.target = message.type === 'channel' ? F.global.channels.findItem('id', client.threadid) : F.global.users.findItem('id', client.threadid);

		if (message.type === 'channel') {
			message.channel = message.target.name;
			message.user = '';
		} else {
			message.channel = '';
			message.user = message.target.name;
		}

		instance.send(message).set('client', client).set('controller', controller);
	};

	instance.on('close', () => OFF('messenger.message', instance.custom.message));
	ON('messenger.message', instance.custom.message);

	instance.reconfigure = function() {
		can = F.global.sendmessage ? true : false;
		instance.status(can ? '' : 'Messenger not found', can ? undefined : 'red');
	};

	instance.on('options', instance.reconfigure);
	instance.reconfigure();
};