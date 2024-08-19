var BLACKLIST = {};

AUTH(function($) {

    // Setup interface for OpenPlatform
    if (CONF.op_reqtoken && CONF.op_restoken) {
        OpenPlatform.auth($);
        return;
    }

    // Check IP blacklist
    if (BLACKLIST[$.ip] > 15) {
        $.invalid();
        return;
    }

    // Get the token from cookies
    var token = $.cookie(CONF.cookie);
    if (token) {
        var session = DECRYPTREQ($, token, CONF.cookie_secret);
		console.log('session', session);
        
        // Fetch user data from NoSQL database
        DB().one("nosql/users").where('username', session.username).callback(function(err, user) {
            if (err || !user) {
                BLACKLIST[$.ip] = (BLACKLIST[$.ip] || 0) + 1;
                $.invalid();
                return;
            }

            // Check session validity
            if (session && user.id === session.username && session.expire > NOW) {
                $.success({ sa: true });
                return;
            } else {
                BLACKLIST[$.ip] = (BLACKLIST[$.ip] || 0) + 1;
                $.invalid();
            }
        });
        return;
    }

    $.invalid();
});

ON('init', function() {

    OpenPlatform.permissions.push({ name: 'Create Flows', value: 'create' });
    OpenPlatform.permissions.push({ name: 'Remove Flows', value: 'remove' });

    for (var key in F.plugins) {
        var item = F.plugins[key];
        if (item.permissions)
            OpenPlatform.permissions.push.apply(OpenPlatform.permissions, item.permissions);
    }



    // Initialize admin user if not exists
    DB().one("nosql/users").where('role', 'admin').callback(function(err, user) {
        if (err || !user) {
			var users = {};
			    users.id        = `U${UID()}`;
			    users.username  = "ardiwijaya";
			    users.password  = "123456".sha256(CONF.cookie_secret);
			    users.firstname = "Ardi";
			    users.lastname  = "Wijaya";
			    users.email     = "ardiwijaya@gmail.com"
			    users.search    = (users.firstname + " " + users.lastname + " " + users.email).toLowerCase();
			    users.dtcreated = NOW;
			    users.role      = "admin";

			DB().insert("nosql/users", users);
        }
    });

    CONF.op_cookie = CONF.cookie;
});

ON('service', function(counter) {
    if (counter % 15 === 0)
        BLACKLIST = {};
});
