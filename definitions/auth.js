AUTH(function($) {

	var token = $.cookie(CONF.cookie);
	if (token) {

		if (BLOCKED($, 15)) {
			$.invalid();
			return;
		}

		var session = DECRYPTREQ($.req, token, CONF.cookie_secret);
		if (session && session.id === PREF.user.id && session.expire > NOW) {
			$.success({ sa: true });
			return;
		}
	}

	$.invalid();
});

if (!PREF.user) {
	var password = GUID(10);
	PREF.set('user', { id: UID(), login: GUID(10), password: password.sha256(CONF.cookie_secret), raw: password });
}