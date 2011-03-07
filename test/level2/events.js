var sys = require('sys');
var testcase = require('nodeunit').testCase;
var EventMonitor = function() {
  self = this;
  self.atEvents = [];
  self.bubbledEvents = [];
  self.capturedEvents = [];
  self.allEvents = [];
  self.handleEvent = function(event) {
    self.allEvents.push(event);
    switch(event.eventPhase) {
    case event.CAPTURING_PHASE:
      self.capturedEvents.push(event);
      break;
    case event.AT_TARGET:
      self.atEvents.push(event);
      break;
    case event.BUBBLING_PHASE:
      self.bubbledEvents.push(event);
      break;
    default:
      throw new events.EventException(0, "Unspecified event phase");
    }
  };
};

global.events = require("../../lib/jsdom/level2/events").dom.level2.events;

// A document is created using implementation.createDocument and cast to a DocumentEvent interface.
// @author Curt Arnold
// @see http://www.w3.org/TR/DOM-Level-2-Events/events#Events-DocumentEvent
exports['DocumentEvent interface'] = function (test) {
  var doc = require('./events/files/hc_staff.xml').hc_staff();
  test.ok((doc.createEvent instanceof Function), "should have createEvent function");
  test.done();
}

// A document is created using implementation.createDocument and cast to a EventTarget interface.
// @author Curt Arnold
// @see http://www.w3.org/TR/DOM-Level-2-Events/events#Events-EventTarget
exports['EventTarget interface'] = function (test) {
  var doc = require('./events/files/hc_staff.xml').hc_staff();
  test.ok((doc instanceof events.EventTarget), 'should be an instance of EventTarget');
  test.done();
}

// An object implementing the Event interface is created by using DocumentEvent.createEvent method with an eventType
// @author Curt Arnold
// @see http://www.w3.org/TR/DOM-Level-2-Events/events#Events-DocumentEvent-createEvent
exports['create event with each event type'] = function(test){
  var doc = require('./events/files/hc_staff.xml').hc_staff(),
      event_types = {'Events': events.Event,
                     'MutationEvents': events.MutationEvent,
                     'UIEvents': events.UIEvent,
                     'MouseEvents': events.MouseEvent ,
                     'HTMLEvents': events.HTMLEvent};
  test.expect(10);
  for (var type in event_types) {
    var event = doc.createEvent(type);
    test.notEqual(event, null, "should not be null for " + type);
    test.ok((event instanceof event_types[type]),"should be instanceof " + type);
  }
  test.done();
}

// @author Curt Arnold
// @see http://www.w3.org/TR/DOM-Level-2-Events/events#Events-EventTarget-dispatchEvent
// @see http://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-17189187
// @see http://www.w3.org/TR/DOM-Level-2-Events/events#xpointer(id('Events-EventTarget-dispatchEvent')/raises/exception[@name='EventException']/descr/p[substring-before(.,':')='UNSPECIFIED_EVENT_TYPE_ERR'])
exports['dispatch event'] = testcase({
  setUp: function(cb){
    this.doc = require('./events/files/hc_staff.xml').hc_staff();
    cb();
  },

  tearDown: function(cb){
    this.doc = undefined;
    delete(this.doc);
    cb();
  },

  'a null reference passed to dispatchEvent': function (test) {
    var doc = this.doc;
    test.throws(function(){ doc.dispatchEvent(null) }, events.EventException, 'should throw an exception');
    // TODO: figure out the best way to test (exception.code == 0) and (exception.message == 'Null event')
    test.done();
  },

  'a created but not initialized event passed to dispatchEvent': function (test) {
    var doc = this.doc,
        event_types = ['Events', 'MutationEvents', 'UIEvents', 'MouseEvents', 'HTMLEvents'];
    test.expect(event_types.length);
    event_types.forEach(function(type){
      test.throws(function(){ doc.dispatchEvent(doc.createEvent(type)) }, events.EventException, 'should throw an exception for ' + type);
      // Should raise UNSPECIFIED_EVENT_TYPE_ERR EventException.
      // TODO: figure out the best way to test (exception.code == 0) and (exception.message == 'Uninitialized event')
    })
    test.done();
  },

  'an Event initialized with a empty name passed to dispatchEvent': function (test) {
    var doc = this.doc,
        event = doc.createEvent("Events");
    event.initEvent("",false,false);
    test.throws(function(){ doc.dispatchEvent(event) }, events.EventException, 'should throw an exception');
    // Should raise UNSPECIFIED_EVENT_TYPE_ERR EventException.
    // TODO: figure out the best way to test (exception.code == 0) and (exception.message == 'Uninitialized event')
    test.done();
  },

  // An EventListener registered on the target node with capture false, should recieve any event fired on that node.
  'EventListener with capture false': function (test) {
    var monitor = new EventMonitor();
    this.doc.addEventListener("foo", monitor.handleEvent, false);
    var event = this.doc.createEvent("Events");
    event.initEvent("foo",true,false);
    this.doc.dispatchEvent(event);
    test.expect(3);
    test.equal(monitor.atEvents.length, 1, 'should recieve atEvent');
    test.equal(monitor.bubbledEvents.length, 0, 'should not receive at bubble phase');
    test.equal(monitor.capturedEvents.length, 0, 'should not receive at capture phase');
    test.done();
  },

  // An event is dispatched to the document with a capture listener attached.
  // A capturing EventListener will not be triggered by events dispatched directly to the EventTarget upon which it is registered.
  'EventListener with capture true': function (test) {
    var monitor = new EventMonitor();
    this.doc.addEventListener("foo", monitor.handleEvent, true);
    var event = this.doc.createEvent("Events");
    event.initEvent("foo",true,false);
    this.doc.dispatchEvent(event);
    test.expect(3);
    test.equal(monitor.atEvents.length, 0, 'should not recieve atEvent');
    test.equal(monitor.bubbledEvents.length, 0, 'should not receive at bubble phase');
    test.equal(monitor.capturedEvents.length, 0, 'should not receive at capture phase');
    test.done();
  },

  // The same monitor is registered twice and an event is dispatched.  The monitor should recieve only one handleEvent call.
  'EventListener is registered twice': function (test) {
    var monitor = new EventMonitor();
    this.doc.addEventListener("foo", monitor.handleEvent, false);
    this.doc.addEventListener("foo", monitor.handleEvent, false);
    var event = this.doc.createEvent("Events");
    event.initEvent("foo",true,false);
    this.doc.dispatchEvent(event);
    test.expect(3);
    test.equal(monitor.atEvents.length, 1, 'should recieve atEvent only once');
    test.equal(monitor.bubbledEvents.length, 0, 'should not receive at bubble phase');
    test.equal(monitor.capturedEvents.length, 0, 'should not receive at capture phase');
    test.done();
  },

  // The same monitor is registered twice, removed once, and an event is dispatched. The monitor should recieve only no handleEvent calls.
  'EventListener is registered twice, removed once': function (test) {
    var monitor = new EventMonitor();
    this.doc.addEventListener("foo", monitor.handleEvent, false);
    this.doc.addEventListener("foo", monitor.handleEvent, false);
    this.doc.removeEventListener("foo", monitor.handleEvent, false);
    var event = this.doc.createEvent("Events");
    event.initEvent("foo",true,false);
    this.doc.dispatchEvent(event);
    test.equal(monitor.allEvents.length, 0, 'should not receive any handleEvent calls');
    test.done();
  },

  // A monitor is added, multiple calls to removeEventListener are made with similar but not identical arguments, and an event is dispatched.
  // The monitor should recieve handleEvent calls.
  'EventListener is registered, other listeners (similar but not identical) are removed': function (test) {
    var monitor = new EventMonitor();
    var other = {handleEvent: function(){}}
    this.doc.addEventListener("foo", monitor.handleEvent, false);
    this.doc.removeEventListener("foo", monitor.handleEvent, true);
    this.doc.removeEventListener("food", monitor.handleEvent, false);
    this.doc.removeEventListener("foo", other.handleEvent, false);
    var event = this.doc.createEvent("Events");
    event.initEvent("foo",true,false);
    this.doc.dispatchEvent(event);
    test.equal(monitor.allEvents.length, 1, 'should still receive the handleEvent call');
    test.done();
  },

  // Two listeners are registered on the same target, each of which will remove both itself and the other on the first event.  Only one should see the event since event listeners can never be invoked after being removed.
  'two EventListeners which both handle by unregistering itself and the other': function (test) {
    // setup
    var es = [];
    var ls = [];
    var EventListener1 = function() { ls.push(this); }
    var EventListener2 = function() { ls.push(this); }
    EventListener1.prototype.handleEvent = function(event) { _handleEvent(event); }
    EventListener2.prototype.handleEvent = function(event) { _handleEvent(event); }
    var _handleEvent = function(event) {
      es.push(event);
      ls.forEach(function(l){
        event.currentTarget.removeEventListener("foo", l.handleEvent, false);
      })
    }
    // test
    var listener1 = new EventListener1();
    var listener2 = new EventListener2();
    this.doc.addEventListener("foo", listener1.handleEvent, false);
    this.doc.addEventListener("foo", listener2.handleEvent, false);
    var event = this.doc.createEvent("Events");
    event.initEvent("foo",true,false);
    this.doc.dispatchEvent(event);
    test.equal(es.length, 1, 'should only be handled by one EventListener');
    test.done();
  }
})

exports['init event'] = testcase({
  setUp: function(cb){
    this.doc = require('./events/files/hc_staff.xml').hc_staff();
    this.event_types = ['Events', 'MutationEvents']
    cb();
  },

  tearDown: function(cb){
    this.doc = undefined;
    this.event_types = undefined;
    delete(this.doc);
    delete(this.event_types);
    cb();
  },

  // The Event.initEvent method is called for event returned by DocumentEvent.createEvent("Events") and DocumentEvent.createEvent("MutationEvents")
  // The state is checked to see if it reflects the parameters.
  // @author Curt Arnold
  // @see http://www.w3.org/TR/DOM-Level-2-Events/events#Events-Event-initEvent
  'set state from params, bubble no cancel': function (test) {
    var doc = this.doc;
    test.expect(8);
    this.event_types.forEach(function(type){
      var event = doc.createEvent(type);
      test.notEqual(event, null, 'event should not be null');
      event.initEvent('rotate', true, false);
      test.equal(event.type, 'rotate', 'event type should be \"rotate\" for ' + type);
      test.equal(event.bubbles, true, 'event should bubble for ' + type);
      test.equal(event.cancelable, false, 'event should not be cancelable for ' + type);
    })
    test.done();
  },

  // The Event.initEvent method is called for event returned by DocumentEvent.createEvent("Events") and DocumentEvent.createEvent("MutationEvents")
  // The state is checked to see if it reflects the parameters.
  // @author Curt Arnold
  // @see http://www.w3.org/TR/DOM-Level-2-Events/events#Events-Event-initEvent
  'set state from params, cancel no bubble': function (test) {
    var doc = this.doc;
    test.expect(8);
    this.event_types.forEach(function(type){
      var event = doc.createEvent(type);
      test.notEqual(event, null, 'event should not be null');
      event.initEvent('rotate', false, true);
      test.equal(event.type, 'rotate', 'event type should be \"rotate\" for ' + type);
      test.equal(event.bubbles, false, 'event should not bubble for ' + type);
      test.equal(event.cancelable, true, 'event should be cancelable for ' + type);
    })
    test.done();
  },

  // The Event.initEvent method is called for event returned by DocumentEvent.createEvent("Events") and DocumentEvent.createEvent("MutationEvents")
  // The state is checked to see if it reflects the parameters.
  // initEvent may be called multiple times and the last time is definitive.
  // @author Curt Arnold
  // @see http://www.w3.org/TR/DOM-Level-2-Events/events#Events-Event-initEvent
  'initEvent called multiple times, final time is definitive': function (test) {
    var doc = this.doc;
    test.expect(14);
    this.event_types.forEach(function(type){
      var event = doc.createEvent(type);
      test.notEqual(event, null, 'event should not be null for ' + type);
      // rotate
      event.initEvent("rotate", true, true);
      test.equal(event.type, 'rotate', 'event type should be \"rotate\" for ' + type);
      test.equal(event.bubbles, true, 'event should bubble for ' + type);
      test.equal(event.cancelable, true, 'event should be cancelable for ' + type);
      // shear
      event.initEvent("shear", false, false);
      test.equal(event.type, 'shear', 'event type should be \"shear\" for ' + type);
      test.equal(event.bubbles, false, 'event should not bubble for ' + type);
      test.equal(event.cancelable, false, 'event should not be cancelable for ' + type);
    })
    test.done();
  },
})

exports['capture event'] = testcase({
  setUp: function(cb){
    this.doc = require('./events/files/hc_staff.xml').hc_staff();
    this.monitor = new EventMonitor();
    this.plist = this.doc.getElementsByTagName("p");
    this.event = this.doc.createEvent("Events");
    this.event.initEvent("foo",true,false);
    cb();
  },

  tearDown: function(cb){
    var self = this;
    ['doc', 'monitor', 'plist', 'event'].forEach(function(x){
      this[x] = undefined;
      delete(this[x]);
    })
    cb();
  },

  'all capturing listeners in a direct line from dispatched node will receive the event': function(test) {
    this.plist.item(0).addEventListener("foo", this.monitor.handleEvent, true);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(3);
    test.equal(this.monitor.atEvents.length, 1, 'should be at 1 event');
    test.equal(this.monitor.bubbledEvents.length, 0, 'should not have any bubbled events');
    test.equal(this.monitor.capturedEvents.length, 1, 'should have captured 1 event');
    test.done();
  },

  'only capture listeners in a direct line from target to the document node should receive the event': function(test) {
    var self = this;
    this.doc.getElementsByTagName("title").item(0).addEventListener("foo", this.monitor.handleEvent, true);
    this.plist.item(0).addEventListener("foo", function(event) { event.preventDefault(); self.monitor.handleEvent(event) }, false);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    var return_val = this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(4);
    test.equal(return_val, false, 'dispatchEvent should return *false*');
    test.equal(this.monitor.atEvents.length, 1, 'should be at 1 event');
    test.equal(this.monitor.bubbledEvents.length, 1, 'should have bubbled 1 event');
    test.equal(this.monitor.capturedEvents.length, 0, 'should not have captured any events');
    test.done();
  }
})

exports['bubble event'] = testcase({
  setUp: function(cb){
    this.doc = require('./events/files/hc_staff.xml').hc_staff();
    this.monitor = new EventMonitor();
    this.plist = this.doc.getElementsByTagName("p");
    this.event = this.doc.createEvent("Events");
    this.event.initEvent("foo",true,false);
    cb();
  },

  tearDown: function(cb){
    var self = this;
    ['doc', 'monitor', 'plist', 'event'].forEach(function(x){
      this[x] = undefined;
      delete(this[x]);
    })
    cb();
  },

  'all non-capturing listeners in a direct line from dispatched node will receive a bubbling event': function(test) {
    this.plist.item(0).addEventListener("foo", this.monitor.handleEvent, false);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(3);
    test.equal(this.monitor.atEvents.length, 1, 'should be at 1 event');
    test.equal(this.monitor.bubbledEvents.length, 1, 'should have 1 bubbled event');
    test.equal(this.monitor.capturedEvents.length, 0, 'should not have any captured events');
    test.done();
  },

  'only bubble listeners in a direct line from target to the document node should receive the event': function(test) {
    var self = this;
    this.doc.getElementsByTagName("title").item(0).addEventListener("foo", this.monitor.handleEvent, false);
    this.plist.item(0).addEventListener("foo", function(event) { event.preventDefault(); self.monitor.handleEvent(event) }, true);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    var return_val = this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(4);
    test.equal(return_val, false, 'dispatchEvent should return *false*');
    test.equal(this.monitor.atEvents.length, 1, 'should be at 1 event');
    test.equal(this.monitor.bubbledEvents.length, 0, 'should not have any bubbled events');
    test.equal(this.monitor.capturedEvents.length, 1, 'should have captured 1 event');
    test.done();
  },

  'if an event does not bubble, bubble listeners should not receive the event': function(test) {
    var self = this;
    this.doc.getElementsByTagName("body").item(0).addEventListener("foo", this.monitor.handleEvent, true);
    this.plist.item(0).addEventListener("foo", function(event) { event.preventDefault(); self.monitor.handleEvent(event) }, false);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    this.event.initEvent("foo",false,false);
    var return_val = this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(4);
    test.equal(return_val, false, 'dispatchEvent should return *false*');
    test.equal(this.monitor.atEvents.length, 1, 'should be at 1 event');
    test.equal(this.monitor.bubbledEvents.length, 0, 'should not have any bubbled events');
    test.equal(this.monitor.capturedEvents.length, 1, 'should have captured 1 event');
    test.done();
  }
})

exports['stop propagation'] = testcase({
  setUp: function(cb){
    this.doc = require('./events/files/hc_staff.xml').hc_staff();
    this.monitor = new EventMonitor();
    this.plist = this.doc.getElementsByTagName("p");
    this.event = this.doc.createEvent("Events");
    this.event.initEvent("foo",true,false);
    cb();
  },

  tearDown: function(cb){
    var self = this;
    ['doc', 'monitor', 'plist', 'event'].forEach(function(x){
      this[x] = undefined;
      delete(this[x]);
    })
    cb();
  },

  'should prevent the target from receiving the event': function(test) {
    var self = this;
    this.plist.item(0).addEventListener("foo", function(event) { event.stopPropagation(); self.monitor.handleEvent(event) }, true);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(3);
    test.equal(this.monitor.atEvents.length, 0, 'should be at 0 events');
    test.equal(this.monitor.bubbledEvents.length, 0, 'should have no bubbled events');
    test.equal(this.monitor.capturedEvents.length, 1, 'should have 1 captured event');
    test.done();
  },

  'should prevent all listeners from receiving the event': function(test) {
    var self = this;
    this.doc.getElementsByTagName("body").item(0).addEventListener("foo", this.monitor.handleEvent, false);
    this.plist.item(0).addEventListener("foo", function(event) { event.stopPropagation(); self.monitor.handleEvent(event) }, false);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(3);
    test.equal(this.monitor.atEvents.length, 1, 'should be at 1 event');
    test.equal(this.monitor.bubbledEvents.length, 1, 'should have 1 bubbled event');
    test.equal(this.monitor.capturedEvents.length, 0, 'should have no captured events');
    test.done();
  }
})

exports['prevent default'] = testcase({
  setUp: function(cb){
    this.doc = require('./events/files/hc_staff.xml').hc_staff();
    this.monitor = new EventMonitor();
    this.plist = this.doc.getElementsByTagName("p");
    this.event = this.doc.createEvent("Events");
    this.event.initEvent("foo",true,true);
    cb();
  },

  tearDown: function(cb){
    var self = this;
    ['doc', 'monitor', 'plist', 'event'].forEach(function(x){
      this[x] = undefined;
      delete(this[x]);
    })
    cb();
  },

  'a cancelable event can have its default event disabled': function(test) {
    var self = this;
    this.doc.getElementsByTagName("body").item(0).addEventListener("foo", this.monitor.handleEvent, true);
    this.plist.item(0).addEventListener("foo", function(event) { event.preventDefault(); self.monitor.handleEvent(event) }, false);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    var return_val = this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(4);
    test.equal(return_val, true, 'dispatchEvent should return *true*');
    test.equal(this.monitor.atEvents.length, 1, 'should be at 1 event');
    test.equal(this.monitor.bubbledEvents.length, 1, 'should have bubbled 1 event');
    test.equal(this.monitor.capturedEvents.length, 1, 'should have captured 1 event');
    test.done();
  },

  'a non-cancelable event cannot have its default event disabled': function(test) {
    var self = this;
    this.doc.getElementsByTagName("body").item(0).addEventListener("foo", this.monitor.handleEvent, true);
    this.plist.item(0).addEventListener("foo", function(event) { event.preventDefault(); self.monitor.handleEvent(event) }, false);
    this.plist.item(0).firstChild.addEventListener("foo", this.monitor.handleEvent, false);
    this.event.initEvent("foo",true,false);
    var return_val = this.plist.item(0).firstChild.dispatchEvent(this.event);
    test.expect(4);
    test.equal(return_val, false, 'dispatchEvent should return *false*');
    test.equal(this.monitor.atEvents.length, 1, 'should be at 1 event');
    test.equal(this.monitor.bubbledEvents.length, 1, 'should have bubbled 1 event');
    test.equal(this.monitor.capturedEvents.length, 1, 'should have captured 1 event');
    test.done();
  }
})
