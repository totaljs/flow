Thelpers.url = function(val) {
	var index = val.indexOf('/', 10);
	return index === -1 ? val : val.substring(0, index);
};