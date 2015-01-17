'use strict';

var util = require('util');
var GoodReporter = require('good-reporter');
var hoek = require('hoek');

var GoodMongo = module.exports = function (events, db, options) {
  options = options || {};

  var collectionName = options.collection || 'logs';

  GoodReporter.call(this, events, {
    events: events,
    db: db,
    collectionName: collectionName,
    collection: db.collection(collectionName),
    capped: {
      capped: options.capped,
      size: options.size || 10000000,
      max: options.max
    },
    force: options.force
  });

  this._prepared = false;
};

util.inherits(GoodMongo, GoodReporter);

GoodMongo.prototype.start = function (emitter, cb) {
  emitter.on('report', this._handleEvent.bind(this));
  this._prepareConnection(cb);
};

GoodMongo.prototype._report = function (event, eventData) {
  // Ignore errors
  // Support lazy opening the database connection
  var me = this;
  this._prepareConnection(function (err) {
    if (err) return;

    // Cannot extend the eventData object
    var data = hoek.clone(eventData);
    data.timestamp = new Date(data.timestamp);
    me._settings.collection.insert(data, function () {});
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