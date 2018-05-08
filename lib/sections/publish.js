var utils = require(__dirname + '/utils.js');
var uuid  = require('node-uuid');
var os    = require('os');

var publish = function(eventType, args, callback){
  var self = this;
  var queue = self.options.incommigQueue;
  var klass = self.options.busDriverClassKey;
  var payload = [publishMetadata(eventType, args)];

  console.log("= DEBUGGING = Publishing");
  console.log("= DEBUGGING == Queue: " + queue);
  console.log("= DEBUGGING == Class: " + klass);
  console.log("= DEBUGGING == Payload: " + payload);
  console.log("= DEBUGGING === Self: ");
  console.log(self);
  console.log("= DEBUGGING === queueObject: ");
  console.log(self.queueObject);

  self.queueObject.enqueue(queue, klass, payload, function(err, toRun){
    if(typeof callback === 'function'){ callback(err, toRun); }
  });
};

var publishAt = function(timestamp, eventType, args, callback){
  var self    = this;
  var queue   = self.options.incommigQueue;
  var klass   = self.options.busPublisherClassKey;
  var payload = [publishMetadata(eventType, args)];

  if(payload.bus_delayed_until === undefined){
    payload.bus_delayed_until = Math.floor(timestamp/1000);
  }

  delete payload.bus_published_at; // will get re-added upon re-publish

  self.queueObject.enqueueAt(timestamp, queue, klass, payload, function(err){
    if(typeof callback === 'function'){ callback(err); }
  });
};

var publishIn = function(time, eventType, args, callback){
  var self = this;
  var timestamp = new Date().getTime() + time;
  self.publishAt(timestamp, eventType, args, callback);
};

var publishMetadata = function(eventType, args){
  var payload = {};
  if(eventType){
    payload.bus_event_type = eventType;
  } else {
    payload.bus_event_type = null;
  }
  payload.bus_created_at   = utils.timestamp(); // TODO: get this back in ruby resque-bus
  payload.bus_published_at = utils.timestamp();
  payload.bus_id           = utils.timestamp() + "-" + uuid.v4();
  payload.bus_app_hostname = os.hostname();

  for(var i in args){
    payload[i] = args[i];
  }

  return payload;
};

var publisherJob = function(){
  return {
    plugins: [],
    pluginOptions: [],
    perform: function(args, callback){
      var self = this;

      self.bus.publish(args.bus_event_type, args, function(err){
        callback(err, self.options.busDriverClassKey);
      });
    }
  };
};

exports.publish      = publish;
exports.publishAt    = publishAt;
exports.publishIn    = publishIn;
exports.publisherJob = publisherJob;
