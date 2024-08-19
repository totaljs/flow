/**
 * Working With TextDB NoSQL Database From Total JS
 * 1. DB()
 * 2. DATA
 */


/**
 * INSERT DATABASE
 */
// var users = {};
//     users.id        = `U${UID()}`;
//     users.username  = "ardiwijaya";
//     users.password  = "123456".sha256(CONF.cookie_secret);
//     users.firstname = "Ardi";
//     users.lastname  = "Wijaya";
//     users.email     = "ardiwijaya@gmail.com"
//     users.search    = (users.firstname + " " + users.lastname + " " + users.email).toLowerCase();
//     users.dtcreated = NOW;
//     users.role      = "admin";

// DB().insert("nosql/users", users);

/**
 * READ DATABASE
 */
// DB().one("nosql/users").where('username', 'snipkode').callback(console.log);
// DB().read("nosql/users").where('username', 'snipkode').callback(console.log);
// DB().find("nosql/users").callback(console.log);

/**
 * REMOVE DATABASE
 */

// DB().remove("nosql/users").where("id", "UIold0N1cJ61f").callback(console.log);

/**
 * QUERY DATABASE
 */

// DB().one("nosql/users").search('search', 'hafidz').sort('dtcreated_desc').error("Internal server error!").callback((err, response) => {
//     if(err) throw new Error(err);
//     console.log(response);
// });
// DB().find("nosql/users").search('username', 'hafidz').callback(function(err, response){
//     if(err) console.log(err);
//     console.log("data", response);
// });

/**
 *  PAGINATION 
 * */
// DB().find("nosql/users").fields("username, firstname, email, dtcreated").take(2).skip(0).callback(console.log)
// DB().find('nosql/users').page(3, 2).callback(console.log);


/**
 * UPDATE DATABASE
 */
// var updateUsers = {};
//     updateUsers.dtupdated = NOW;
//     updateUsers.firstname  = "Alam Santiko";

// DB().update("nosql/users", updateUsers, true).where("username", "snipkode").error("Terjadi Error").callback((err, response) => {
//     if(err) throw new Error("Terjadi kesalahan updated");
//     console.log("Updated data", response)
// })


/**
 * TRUNCATE DATA
 */

// DB().truncate("nosql/users").callback(console.log)


/**
 * MULTIPLE WHERE CLAUSE
 * 
 */
// DB().find("nosql/users")
// .fields("id, username, email,  dtcreated")
// .equal({ username: "ardiwijaya9", password: "123456".sha256(CONF.cookie_secret)})
// .callback(console.log);


/**
 * Query By Year, Month, Day, Minute
 */
// DB().find('nosql/users').month('dtcreated', 6).callback(console.log);
