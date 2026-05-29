define(function(require) {
  var core = require('framework/core');
  var bh = require('utilities/bindingHandlers');
  var TopPanel = require('components/TopPanel');

  var ko = core.ko;

  // A dummy application to provide the correct setup for Client modules, as many refer to the current app.
  var CompatibilityApplication = core.Application.extend({
      launch: function() {
          // no-op to prevent the Client app to start routing
      }
  });
  var app = new CompatibilityApplication();
  app.launch();

  if (!window.spiirCompat_topPanelMenu)
      throw new Error('Missing compatibility menu for TopPanel');

  var topPanel = new TopPanel(window.spiirCompat_topPanelMenu);
  ko.applyBindings(topPanel, $('.topPanel').get(0));
});