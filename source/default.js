var MESSAGE_TRIGGER = { type: 'trigger' };
var flowtriggers = {};

function diagonal(x1, y1, x2, y2) {
	return 'M' + x1 + ',' + y1 + 'C' + ((x1 + x2 ) / 1.9) + ',' + y1 + ' ' + ((x1 + x2) / 2.1) + ',' + y2 + ' ' + x2 + ',' + y2;
}

function markdown(value, el) {
	setTimeout(function(el) {
		$(el || document.body).find('pre code').each(function(i, block) {
			if (!block.$processed) {
				block.$processed = true;
				hljs.highlightBlock(block);
			}
		});
	}, 1, el);
	return marked(value.trim()).replace(/<img/g, '<img class="img-responsive"').replace(/<table/g, '<table class="table table-bordered"').replace(/<a\s/g, '<a target="_blank"');
}

function savescrollposition() {
	if (common.tab) {
		var el = $('.designer-scrollbar');
		var tmp = common.tabscroll['tab' + common.tab.id];
		var pos = { x: el.prop('scrollLeft'), y: el.prop('scrollTop') };
		if (!tmp || (tmp.x !== pos.x && tmp.y !== pos.y))
			SET('common.tabscroll.tab' + common.tab.id, pos);
	}
}

Tangular.register('duration', function(ms) {
	return ms > 999 ? ((ms / 1000).format(1) + ' s') : (ms + ' ms');
});

Tangular.register('trafficsort', function(value, name) {
	var str = '<i class="fa fa-caret-{0}"></i>';
	if (value === name)
		return str.format('up');
	if (value === ('!' + name))
		return str.format('down');
	return '';
});

ON('ready', function() {

	setTimeout(function() {
		SETTER('loading', 'hide');
		$('.ui-loading').rclass('ui-loading-firstload');
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
	if (value instanceof jQuery)
		value = value.attr('transform');
	var arr = value.substring(10, value.length - 1).split(/\s|,/);
	return { x: arr[0].parseInt(), y: arr[1].parseInt() };
}

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
	el.aclass('success-animation');
	setTimeout(function() {
		el.rclass('success-animation');
		setTimeout(function() {
			el.hide();
		}, 1000);
	}, 1500);
	SETTER('loading', 'hide', 500);
}
