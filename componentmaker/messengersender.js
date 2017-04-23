const TRIGGER = 'getMessengerData';
const MESSAGE = {};

exports.id = 'messengersender';
exports.title = 'Messenger: Sender';
exports.version = '1.0.0';
exports.author = 'Peter Širka';
exports.group = 'Notifications';
exports.color = '#8CC152';
exports.input = 1;
exports.options = { from: '' };
exports.icon = 'commenting-o';
exports.readme = `# Total.js Messenger: Sender

This component can send message.

- input has to be a Markdown content`;

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="from" data-source="messengerdata.users" data-empty="" class="m" data-required="true">@(Who is the sender?)</div>
	<div data-jc="dropdown" data-jc-path="location" data-source="messengerdata.channels" data-empty="@(Current location)" class="m">@(Location)</div>
</div>
<script>TRIGGER('{0}', 'messengerdata');</script>`.format(TRIGGER);

exports.install = function(instance) {

	var can;

	instance.reconfigure = function() {
		can = F.global.sendmessage ? true : false;

		if (!can) {
			instance.status('Messenger not found', 'red');
			return;
		}

		var user = null;
		if (instance.options.from) {
			switch (instance.options.from) {
				case '$sender':
					instance.status('From: sender');
					break;
				case '$target':
					instance.status('From: recipient');
					break;
				default:
					var user = F.global.users.findItem('id', instance.options.from);
					user && instance.status('From: ' + user.name);
					break;
			}
		} else
			instance.status('Not configured', 'red');
	};

	instance.on('data', function(response) {

		if (!can)
			return;

		var data = response.data;
		if (data == null)
			return;

		var client = response.get('client');
		if (!instance.options.location) {
			if (!client || (instance.options.from === '$target' && client.threadtype === 'channel') || (instance.options.from !== '$sender' && instance.options.from !== '$target' && client.threadtype === 'user' && client.threadid !== instance.options.from))
				return;
		}

		MESSAGE.idtarget = instance.options.location ? instance.options.location : instance.options.from === '$target' ? client.user.id : client.threadid;
		MESSAGE.target = instance.options.location ? 'channel' : client.threadtype;
		MESSAGE.iduser = instance.options.from === '$sender' ? client.user.id : instance.options.from === '$target' ? client.threadid : instance.options.from;

		MESSAGE.body = typeof(data) === 'object' ? ('```json\n' + JSON.stringify(data, null, '    ') + '\n```') : data.toString();
		OPERATION('send', MESSAGE, NOOP);
	});

	instance.on('options', instance.reconfigure);
	setTimeout(instance.reconfigure, 1000);
};

FLOW.trigger(TRIGGER, function(next) {
	var response = {};
	response.users = [];
	response.channels = [];
	response.users.push({ id: '$sender', name: 'From: sender' });
	response.users.push({ id: '$target', name: 'From: recipient' });
	F.global.users && F.global.users.forEach(item => response.users.push({ id: item.id, name: item.name }));
	F.global.channels && F.global.channels.forEach(item => response.channels.push({ id: item.id, name: item.name }));
	next(response);
});

exports.uninstall = function() {
	FLOW.trigger(TRIGGER, null);
};