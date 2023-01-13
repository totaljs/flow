var BLACKLIST = {};

OpenPlatform.permissions.push({ name: 'Create Flows', value: 'create' });
OpenPlatform.permissions.push({ name: 'Remove Flows', value: 'remove' });

AUTH(function($) {

	// Setup interface
	if (CONF.op_reqtoken && CONF.op_restoken) {
		OpenPlatform.auth($);
		return;
	}

	if (BLACKLIST[$.ip] > 15) {
		$.invalid();
		return;
	}

	var token = $.cookie(CONF.cookie);
	if (token) {
		var session = DECRYPTREQ($.req, token, CONF.cookie_secret);
		if (session && session.id === PREF.user.id && session.expire > NOW) {
			$.success({ sa: true });
			return;
		} else
			BLACKLIST[$.ip] = (BLACKLIST[$.ip] || 0) + 1;
	}

	$.invalid();
});

if (!PREF.user) {
	var password = GUID(10);
	PREF.set('user', { id: UID(), login: GUID(10), password: password.sha256(CONF.cookie_secret), raw: password });
}

ON('service', function(counter) {
	if (counter % 15 === 0)
		BLACKLIST = {};
});