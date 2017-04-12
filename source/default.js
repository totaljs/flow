var MESSAGE_TRIGGER = { type: 'trigger' };
var EMPTYTRANSLATE = { x: 0, y: 0 };
var flowtriggers = {};

function diagonal(x1, y1, x2, y2) {
	return 'M' + x1 + ',' + y1 + 'C' + ((x1 + x2 ) / 2) + ',' + y1 + ' ' + ((x1 + x2) / 2) + ',' + y2 + ' ' + x2 + ',' + y2;
}

ON('ready', function() {

	setTimeout(function() {
		SETTER('loading', 'hide');
		$('.ui-loading').removeClass('ui-loading-firstload');
	}, 2000);

	EMIT('resize', $(window));
});

$(window).on('resize', function() {
	EMIT('resize', $(window));
});

function getSize(el) {
	var size = SINGLETON('size');
	el = $(el);
	size.width = el.width();
	size.height = el.height();
	return size;
}

function getTranslate(value) {
	var arr = value.substring(10, value.length - 1).split(/\s|,/);
	return { x: arr[0].parseInt(), y: arr[1].parseInt() };
}

d3.selection.prototype.moveToFront = function() {
	return this.each(function(){
		this.parentNode.appendChild(this);
	});
};

d3.selection.prototype.moveToBack = function() {
	return this.each(function() {
		var pn = this.parentNode;
		var f = pn.firstChild;
		f && pn.insertBefore(this, f);
	});
};

d3.selection.prototype.getTranslate = function() {
	if (!this || !this.attr)
		return EMPTYTRANSLATE;
	var arr = null;
	try {
		var value = this.attr('transform');
		arr = value.substring(10, value.length - 1).split(/\s|,/);
	} catch (e) {}
	return arr ? { x: arr[0].parseInt(), y: arr[1].parseInt() } : EMPTYTRANSLATE;
};

window.TRIGGER = function(name, data, callback) {

	if (callback === undefined) {
		callback = data;
		data = undefined;
	}

	var id = GUID(15);
	MESSAGE_TRIGGER.name = name;
	MESSAGE_TRIGGER.id = id;
	MESSAGE_TRIGGER.body = data;
	flowtriggers[id] = callback;
	SETTER('websocket', 'send', MESSAGE_TRIGGER);
};

function success() {
	var el = $('#success');
	el.show();
	el.addClass('success-animation');
	setTimeout(function() {
		el.removeClass('success-animation');
		setTimeout(function() {
			el.hide();
		}, 1000);
	}, 1500);
	FIND('loading').hide(500);
}