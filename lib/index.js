'use strict';

var GoodSqueeze = require('good-squeeze');
var hoek = require('hoek');

var GoodMongo = module.exports = function (events, config) {
  if (!(this instanceof GoodMongo)) {
    return new GoodMongo(events, config);
  }

  config = config || {};

  var collectionName = config.collection || 'log';
  var self = this;
  this._settings = {
    events: events,
    db: config.db,
    collectionName: collectionName,
    collection: config.db.collection(collectionName),
    capped: {
      capped: config.capped,
      size: config.size || 10000000,
      max: config.max
    },
    force: config.force,
    onerror: config.onerror || hoek.ignore,
    oninsert: function (err) {
      if (err) self.onerror(err);
    }
  };

  this._streams = {
    squeeze: GoodSqueeze.Squeeze(events)
  };

  this._prepared = false;
};

GoodMongo.prototype.init = function (stream, emitter, cb) {
  this._streams.squeeze.on('data', this._report.bind(this));
  stream.pipe(this._streams.squeeze);
  this._prepareConnection(cb);
};

GoodMongo.prototype._report = function (report) {
  // Ignore errors
  // Support lazy opening the database connection
  var me = this;
  this._prepareConnection(function (err) {
    if (err) return me._settings.onerror(err);

    // Cannot extend the eventData object
    var data = hoek.clone(report);

    data.timestamp = new Date(data.timestamp);

    if (data.error) {
      // Record the message and stack trace
      var error = {
        message: report.error.message,
        stack: report.error.stack.split('\n').slice(1)
            .map(function (line) {
              return line.trim();
            })
      };

      for (var p in data.error) {
        if (!data.error.hasOwnProperty(p)) continue;
        error[p] = data.error[p];
      }

      data.error = error;
    }

    me._settings.collection.insert(data, me._settings.oninsert);
  });
};

GoodMongo.prototype._prepareConnection = function (cb) {
  if (this._prepared || !this._settings.db.serverConfig.connected) return cb();

  this._prepared = true;
  var me = this;

  if (this._settings.force) {
    // Check whether the collection exists and if so, convert it to a capped
    // collection
    this._settings.db.collection('system.namespaces')
        .find({
          name: this._settings.db.databaseName + '.' +
              this._settings.collectionName
        })
        .nextObject(function (err, doc) {
          if (err) return cb(err);

          if (doc) {
            // Convert it into a capped collection
            me._settings.db.command({
              convertToCapped: me._settings.collectionName,
              size: me._settings.capped.size,
              max: me._settings.capped.max
            }, cb);
          } else {
            me._settings.db.createCollection(me._settings.collectionName,
                me._settings.capped, cb);
          }
        });
  } else {
    // Create a capped collection if it doesn't exist
    this._settings.db.createCollection(this._settings.collectionName,
        this._settings.capped, cb);
  }
};