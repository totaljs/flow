var BLACKLIST = {};

AUTH(function($) {

	// Setup interface
	if (CONF.op_reqtoken && CONF.op_restoken) {
		OpenPlatform.auth($);
		return;
	}

	if (BLACKLIST[$.ip] > 15) {
		$.banned = true;
		$.invalid();
		return;
	}

	let token = $.cookie(CONF.cookie);

	if (CONF.sso) {

		if (TEMP[token]) {
			BLOCKED($, -1);
			fakeuser($, TEMP[token]);
			return;
		}

		RESTBuilder.POST(CONF.sso, { schema: 'Session', data: { app: 'flow' }}).header('authorization', token).header('user-agent', $.headers['user-agent']).callback(function(err, response) {
			if (response && response.id) {
				response.platform.module = response.platform.modules.findItem('id', response.moduleid);
				if (response.platform.module)
					CONF.name = response.platform.module.name;
				TEMP[token] = response;
				fakeuser($, response);
			} else {
				BLACKLIST[$.ip] = (BLACKLIST[$.ip] || 0) + 1;
				$.invalid();
			}
		});
		return;
	}

	if (token) {
		var session = DECRYPTREQ($, token, CONF.cookie_secret);
		if (session && session.id === PREF.user.id && session.expire > NOW) {
			$.success({ sa: true });
			return;
		} else
			BLACKLIST[$.ip] = (BLACKLIST[$.ip] || 0) + 1;
	}

	$.invalid();
});

function fakeuser($, user) {

	// SuperAdmin can change its groups
	if (user.sa) {
		let tmp = $.headers['x-groups'] || $.query._groups;
		if (tmp) {
			tmp = tmp.split(',').trim();
			user = CLONE(user);
			user.groups = tmp;
			user.sa = false;
			user.fake = true;
		} else if (user.fake)
			delete user.fake;
	}

	$.success(user);
}

ON('start', function() {

	OpenPlatform.permissions.push({ name: 'Create Flows', value: 'create' });
	OpenPlatform.permissions.push({ name: 'Remove Flows', value: 'remove' });

	for (let key in Total.plugins) {
		let item = Total.plugins[key];
		if (item.permissions)
			OpenPlatform.permissions.push.apply(OpenPlatform.permissions, item.permissions);
	}

	if (!PREF.user) {
		let password = GUID(10);
		PREF.set('user', { id: UID(), login: GUID(10), password: password.sha256(CONF.cookie_secret), raw: password });
	}

	CONF.op_cookie = CONF.cookie;
});

ON('service', function(counter) {
	if (counter % 15 === 0)
		BLACKLIST = {};
});