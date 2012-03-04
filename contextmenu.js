var contextmenu = function (d, window) {
	"use strict";
	var nativeSupport = ((d.body.contextMenu === null) && window.HTMLMenuItemElement !== undefined),
		lastX,
		lastY,
		mousedown_timeout,
		overlay,
		menustack,
		preview,
		timeout,
		t,
		preview_show_timer;

	function nextTick(callback) {
		setTimeout(callback, 0);
	}
	function guid() {
		return (0 | 10000000 * Math.random()).toString(30) + (0 | 10000000 * Math.random()).toString(30) + (0 | 10000000 * Math.random()).toString(30);
	}
	function sleep_work() {
		var resource, response;
		if (typeof ActiveXObject === 'undefined') {
			resource = new XMLHttpRequest();
		} else {
			resource = new ActiveXObject("Microsoft.XMLHTTP");
		}
		try {
			resource.open('GET', '/', false);
			resource.send(null);
			response = resource.responseText;
		} catch (e) {
			// Ignore
		}
	}
	// Only use sleep if you know what you are doing.
	// WIll max out 100% if using cpu_hog = true!

	function sleep(time, cpu_hog) {
		var t_end = (new Date().getTime()) + time;
		while (new Date().getTime() < t_end) {
			if (!cpu_hog) {
				try {
					sleep_work();
				} catch (ex) {
					console.error(ex);
				}
			}
		}
		return (new Date().getTime()) - t_end;
	}
	function offset(obj) {
		var curleft = 0,
			curtop = 0;
		if (obj.getClientRects) {
			return obj.getClientRects()[0];
		}
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
		return {
			left: curleft,
			top: curtop
		};
	}
	function hideMenu(menu, fade) {
		if (fade) {
			throw ("no need to fade");
			nextTick(function () {
				menu.style.opacity = "0.0";
			});
			setTimeout(function () {
				menu.style.display = "none";
				menu.style.opacity = "1.0";
			}, timeout);
		} else {
			menu.style.display = "none";
		}
		var launcher = menu.launcher;
		if (launcher) {
			launcher.removeAttribute("open");
		}
	}
	function popmenu() {
		var top = menustack.pop();
		hideMenu(top);
		return top;
	}
	function mouseend(e) {
		overlay.style.opacity = "0.0";
		mousedown_timeout = setTimeout(function () {
			while (menustack.length) {
				popmenu(false);
			}
			overlay.style.display = "none";
			overlay.style.opacity = "1.0";
		}, timeout);
	}
	function showMenu(menu) {
		menu.style.display = "inline-block";
	}
	function menuoncontextmenu(e) {
		e.stopPropagation();
		e.preventDefault();
	}
	function mother(name, node) {
		if (node.nodeName === name) {
			return node;
		}
		return mother(name, node.parentNode || {nodeName: name});
	}
	function onmouseover(e) {
		//This event is also triggered after mouseover on submenu menuitems
		var menu = mother("MENU", e.target),
			msl,
			a,
			i;
		if (preview) {
			if (preview === menu) {
				menustack.push(menu);
				preview = undefined;
				return;
			}
			console.error("SHOULD NOT BE A PREVIEW");
		}
		msl = menustack.length;
		//Pop while not menu
		a = menustack.indexOf(menu);
		for (i = msl - 1; i > a; i--) {
			popmenu();
		}
	}
	function onmousedown(e) {
		if (e.target.nodeName === "MENU") {
			if (e.offsetX === 0) {
				//Left 1px border shouldn't be included.
				//Close the menu: (bubble event)
				return;
			}
		}
		e.stopPropagation();
		e.preventDefault();
		return false;
	}
	function onsubcontextmenuout(e) {
		preview_show_timer = clearTimeout(preview_show_timer);
		var menu = mother("MENU", e.toElement);
		if (menu === preview) {
			return false;
		}
		if (preview) {
			hideMenu(preview);
			preview = undefined;
		}
	}
	function onsubcontextmenu(e) {
		preview_show_timer = clearTimeout(preview_show_timer);
		preview_show_timer = setTimeout(function () {
			var menuitem = e.srcElement,
				menu = menuitem.contextMenu,
				pos;
			menu.launcher = menuitem;
			if (preview && preview !== menu) {
				hideMenu(preview);
			}
			preview = menu;
			pos = offset(menuitem);
			menu.style.top = (pos.top - 5) + "px";
			menu.style.left = (pos.left + pos.width - 1) + "px";
			menu.style.display = "inline-block";
			overlay.style.display = "block";
			if (!menuitem.opensubmenu) {
				menuitem.setAttribute("open", true);
			}
		}, 200);
		//Don't stop propagation, the event bubbles to the <menu /> mouseover handler
	}
	function stopPropagation(e) {
		e.stopPropagation();
	}
	function prepareMenu(menu) {
		var p = menu.parentNode,
			clone;
		menu.addEventListener("mouseover", onmouseover, false);
		menu.addEventListener("mousedown", onmousedown);
		menu.addEventListener("contextmenu", menuoncontextmenu);
		if (p.nodeName === "MENU") {
			clone = d.createElement("menuitem");
			menu.classList.add("submenu");
			clone.className =  menu.className;
			clone.setAttribute("label", menu.getAttribute("label"));
			clone.contextMenu = menu;
			clone.addEventListener("mouseover", onsubcontextmenu);
			clone.addEventListener("mouseout", onsubcontextmenuout);

			//This isn't right. It should end the context menu if it was a hold, i.e.,
			//follow the same rules as the parent context menu.
			clone.addEventListener("mouseup", stopPropagation);
			p.replaceChild(clone, menu);
			overlay.appendChild(menu);
		} else {
			p.removeChild(menu);
			overlay.appendChild(menu);
		}
	}
	function initContextMenu(menu, x, y) {
		t = new Date();
		menustack.push(menu);
		menu.style.top = (y - 5) + "px";
		menu.style.left = x + "px";
		showMenu(menu);
		overlay.style.display = "block";
	}
	function oncontextsheet(e) {
		var pos = offset(e.target),
			menu = d.getElementById(e.srcElement.getAttribute("contextmenu"));
		t = new Date();
		initContextMenu(menu, pos.left, pos.top + pos.height + 8);
		e.preventDefault();
		return false;
	}
	function contextMenufor(node) {
		if (!node || !node.hasAttribute) {
			return;
		}
		if (node.hasAttribute("contextmenu")) {
			return node.getAttribute("contextmenu");
		}
		return contextMenufor(node.parentNode);
	}
	function oncontextmenu(e) {
		var menu = d.getElementById(contextMenufor(e.srcElement)),
			x = e.clientX,
			y = e.clientY;
		initContextMenu(menu, e.clientX, e.clientY);
		lastX = x;
		lastY = y;
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	function inititalize() {
		menustack = [];
		overlay = d.createElement("div");
		var os_code = "osx10_7",
			mouseup_wait_for_me = 0,
			i,
			l;
		if (/Mac/.test(navigator.userAgent)) {
			os_code = "osx10_7";
		} else if (/Win/.test(navigator.userAgent)) {
			os_code = "win7";
		}
		d.body.classList.add(os_code);
		overlay.className = "_contextmenu_screen_";

		timeout = 150;
		t = 0;
		d.body.appendChild(overlay);
		overlay.addEventListener("mousedown", function (e) {
			mouseend(e);
		});
		overlay.addEventListener("mouseup", function (e) {
			if (mouseup_wait_for_me) {
				return;
			}
			var menuitem = e.target;
			if (menuitem.nodeName === "MENUITEM" && menuitem.hasAttribute("contextmenu")) {
				return false;
			}
			if (new Date() - t < 300) {
				return;
			}
			if (menuitem.nodeName === "MENUITEM") {
				//Click animation.
				setTimeout(function () {
					menuitem.style.background = "white";
					setTimeout(function () {
						menuitem.style.background = "";
						setTimeout(function () {
							mouseend(e);
						}, 30);
					}, 80);
				}, 10);
			}
		});
		overlay.addEventListener("mousewheel", function (e) {
			e.preventDefault();
			e.stopPropagation();
			return false;
		}, true);
		overlay.addEventListener("contextmenu", function (e) {
			overlay.style.display = "none";
			var node = d.elementFromPoint(e.clientX, e.clientY),
				contextmenu = contextMenufor(node),
				menu,
				x,
				y,
				dx,
				dy;
			if (contextmenu) {
				overlay.style.display = "block";
				clearTimeout(mousedown_timeout);
				e.preventDefault();
				menu = d.getElementById(contextmenu);
				if (menustack[0] === menu) {
					//Same menu:
					x = e.clientX;
					y = e.clientY;
					dx = x - lastX;
					dy = y - lastY;
					lastX = x;
					lastY = y;
					if (dx * dx + dy * dy < 50) {
						overlay.style.opacity = "1.0";
						overlay.style.display = "block";
						clearTimeout(mousedown_timeout);
						nextTick(mouseend);
						return;
					}
				}
				mouseup_wait_for_me++;
				setTimeout(function () {
					while (menustack.length) {
						var m = menustack.pop();
						hideMenu(m);
					}
					overlay.style.display = "none";
					overlay.style.opacity = "1.0";
					overlay.style.display = "block";
					nextTick(function () {
						mouseup_wait_for_me--;
						initContextMenu(menu, e.clientX, e.clientY);
					});
				}, timeout);
				return false;
			} else {
				overlay.style.opacity = "1.0";
				overlay.style.display = "block";
				clearTimeout(mousedown_timeout);
				nextTick(mouseend);
			}
		});
		overlay.addEventListener("mouseover", function (e) {
			if (e.target !== overlay) {
				return;
			}
			//Hide preview menu.
			preview_show_timer = clearTimeout(preview_show_timer);
			if (preview) {
				hideMenu(preview);
				preview = undefined;
			}
		});
	}
	function attachEventsToAllMenus() {
		var menus_dom = d.getElementsByTagName("menu"),
			i,
			l,
			menus = [];
		for (i = 0, l = menus_dom.length; i < l; i++) {
			menus[i] = menus_dom[i];
		}
		for (i = 0, l = menus.length; i < l; i++) {
			prepareMenu(menus[i]);
		}
	}
	function hookUpContextMenus() {
		var linkers = d.querySelectorAll("[contextmenu]"),
			element,
			i,
			l;
		for (i = 0, l = linkers.length; i < l; i++) {
			element = linkers[i];
			if (element.nodeName === "INPUT") {
				element.addEventListener("click", oncontextsheet);
				//Right clicking buttons. Bad idea?
				element.addEventListener("contextmenu", oncontextsheet);
			} else {
				element.addEventListener("contextmenu", oncontextmenu);
			}
		}
	}
	if (!nativeSupport) {
		inititalize();
		attachEventsToAllMenus();
		hookUpContextMenus();
	}
	function buildMenu(x) {
		var menu = d.createElement("menu"),
			i,
			l,
			xi,
			submenu,
			menuitem;
		for (i = 0, l = x.length; i < l; i++) {
			xi = x[i];
			if (xi.children) {
				submenu = buildMenu(xi.children);
				submenu.setAttribute("label", xi.label);
				menu.appendChild(submenu);
			} else {
				menuitem = d.createElement("menuitem");
				menuitem.setAttribute("label", xi.label);
				xi.onclick && (menuitem.onclick = xi.onclick);
				xi.icon && (menuitem.icon = xi.icon);
				menu.appendChild(menuitem);
			}
		}
		return menu;
	}
	function contextmenu(x) {
		var menu = buildMenu(x),
			submenus,
			menus,
			i,
			l;
		d.body.appendChild(menu);
		if (nativeSupport) {
			return menu;
		}
		submenus = menu.getElementsByTagName("menu");
		menus = [menu];
		for (i = 0, l = submenus.length; i < l; i++) {
			menus.push(submenus[i]);
		}
		for (i = 0, l = menus.length; i < l; i++) {
			prepareMenu(menus[i]);
		}
		return menu;
	}
	contextmenu.show = function (menu, x, y) {
		if (nativeSupport) {
			throw ("Not supported");
		}
		if (typeof menu === "string") {
			menu = d.getElementById(menu);
		}
		initContextMenu(menu, x, y);
		return this;
	}
	return contextmenu;
}(document, window);