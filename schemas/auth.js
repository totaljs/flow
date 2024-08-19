// Action to read logged user info
NEWACTION('Auth/read', {
    name: 'Read logged user info',
    action: function($) {
        var token = $.cookie(CONF.cookie);
        var session = DECRYPTREQ($, token, CONF.cookie_secret);
        DB().one("nosql/users").where('id', session.id).callback(function(err, user) {
            if (err || !user) {
                $.invalid('User not found');
                return;
            }
            var model = {};
            model.username = user.username;
            model.dtcreated = user.dtcreated;  // Never send the password back
            $.callback(model);
        });
    }
});

// Action to save logged user info
NEWACTION('Auth/save', {
    name: 'Save logged user info',
    input: '*username,*password',
    action: async function($, model) {
        // Fetch user data from NoSQL database
        var token = $.cookie(CONF.cookie);
        var session = DECRYPTREQ($, token, CONF.cookie_secret);

        DB().one('nosql/users').where('id', session.id).callback(function(err, user) {
            if (err || !user) {
                $.invalid('User not found');
                return;
            }
  
            user.username = model.username;
            user.password = model.password.sha256(CONF.cookie_secret);

            // Save updated user data back to the NoSQL database
            DB().update('nosql/users', user).where('id', user.id).callback(function(err) {
                if (err) {
                    $.invalid('Failed to update user');
                    return;
                }

                // Update session
                var session = {};
                session.id = user.id;
                session.username = user.username;
                session.expire = NOW.add('1 month');
                $.cookie(CONF.cookie, ENCRYPTREQ($, session, CONF.cookie_secret), '1 month');
                $.success();
            });
        });
    }
});

// Action to execute login
NEWACTION('Auth/exec', {
    name: 'Execute login',
    input: '*username,*password',
    action: function($, model) {

        if (BLOCKED($, 10)) {
            $.invalid('@(Invalid credentials)');
            return;
        }

        DB().one("nosql/users").equal({ 
            username: model.username, 
            password: model.password.sha256(CONF.cookie_secret)
        }).callback(function(err, user) {
            console.log(err, user);

            if (err) {
                $.invalid('@(Invalid credentials)');
                return;
            }

            // Create session
            var session = {};
            session.id = user.id;
            session.username = user.username;
            session.expire = NOW.add('1 month');
            $.cookie(CONF.cookie, ENCRYPTREQ($, session, CONF.cookie_secret), '1 month');
            $.success();
        });
    }
});

// Action to logout the user
NEWACTION('Auth/logout', {
    name: 'User logout',
    action: function($) {
        $.cookie(CONF.cookie, '');
        $.success();
    }
});
