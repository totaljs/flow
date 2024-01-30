global.PREF = MEMORIZE('preferences');

(function() {
	for (let key in F.plugins) {
		let item = F.plugins[key];
		if (item.config) {
			for (let m of item.config) {
				if (CONF[m.id] == null)
					CONF[m.id] = m.value;
			}
		}
	}
})();

ON('ready', function() {

	EMIT('init');

	// Due to plugins
	EMIT('reload');

});