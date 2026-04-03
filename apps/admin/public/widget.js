(function() {
  'use strict';

  // Find the script tag to get config
  var scripts = document.querySelectorAll('script[data-key]');
  var script = scripts[scripts.length - 1];
  if (!script) return;

  var publicKey = script.getAttribute('data-key');
  if (!publicKey) return;

  // Determine host from script src
  var src = script.src || '';
  var host = '';
  try {
    var url = new URL(src);
    host = url.origin;
  } catch(e) {
    host = window.location.origin;
  }

  var WIDGET_URL = host + '/widget?key=' + encodeURIComponent(publicKey);
  var containerId = 'chatbox-widget-container';

  // Prevent double init
  if (document.getElementById(containerId)) return;

  // Create container
  var container = document.createElement('div');
  container.id = containerId;
  container.style.cssText = 'position:fixed;bottom:0;right:0;z-index:999999;';
  document.body.appendChild(container);

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = WIDGET_URL;
  iframe.style.cssText = 'border:none;width:420px;height:650px;max-height:calc(100vh - 40px);position:fixed;bottom:20px;right:20px;z-index:999999;display:none;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);';
  iframe.allow = 'microphone;camera';
  iframe.title = 'Chat Widget';
  container.appendChild(iframe);

  // Create floating button
  var btn = document.createElement('button');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999998;width:56px;height:56px;border-radius:16px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s,box-shadow 0.2s;';
  btn.style.background = '#3b82f6';
  btn.onmouseenter = function() { btn.style.transform = 'scale(1.05)'; btn.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; };
  btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
  container.appendChild(btn);

  // Unread badge
  var badge = document.createElement('span');
  badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:bold;display:none;align-items:center;justify-content:center;font-family:system-ui;';
  btn.style.position = 'relative';
  btn.appendChild(badge);

  var isOpen = false;

  btn.onclick = function() {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    btn.style.display = isOpen ? 'none' : 'flex';
    if (isOpen) {
      badge.style.display = 'none';
      badge.textContent = '';
    }
  };

  // Listen for messages from iframe
  window.addEventListener('message', function(event) {
    if (!event.data || typeof event.data !== 'object') return;

    switch (event.data.type) {
      case 'chatbox:close':
        isOpen = false;
        iframe.style.display = 'none';
        btn.style.display = 'flex';
        break;

      case 'chatbox:unread':
        var count = event.data.count || 0;
        if (count > 0 && !isOpen) {
          badge.textContent = count > 9 ? '9+' : String(count);
          badge.style.display = 'flex';
        }
        break;

      case 'chatbox:config':
        // Apply button color from config
        if (event.data.headerColor) {
          btn.style.background = event.data.headerColor;
        }
        if (event.data.position === 'left') {
          iframe.style.right = 'auto';
          iframe.style.left = '20px';
          btn.style.right = 'auto';
          btn.style.left = '20px';
        }
        break;

      case 'chatbox:resize':
        if (event.data.height) iframe.style.height = event.data.height + 'px';
        if (event.data.width) iframe.style.width = event.data.width + 'px';
        break;
    }
  });

  // Fetch config to style the button before widget loads
  fetch(host + '/api/v1/chat/init/' + encodeURIComponent(publicKey))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.config) {
        if (data.config.headerColor) btn.style.background = data.config.headerColor;
        if (data.config.widgetPosition === 'left') {
          iframe.style.right = 'auto'; iframe.style.left = '20px';
          btn.style.right = 'auto'; btn.style.left = '20px';
        }
      }
    })
    .catch(function() {});
})();
