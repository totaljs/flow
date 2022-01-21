FUNC.import = function(callback) {
	SET('importform @default', { callback: callback });
	SET('common.form', 'importform');
};