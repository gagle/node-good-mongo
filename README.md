good-mongo
==========

#### MongoDB broadcasting for Good process monitor ####

[![npm][npm-image]][npm-url]

This is a [good-reporter][good-reporter] implementation to write [hapi][hapi] server events to a MongoDB database.

MongoDB has the concept of a [Capped collection][capped-collection] and it can be used for logging purposes. This reporter tries to create a capped collection when the plugin is registered. However, it's not required to have the connection open at the time of registering the plugin, it will try to prepare the collection later each time a log event is emitted.

__GoodMongo(events, db[, options])__  
Creates a new GoodMongo instance with the following arguments:

- __events__ - _Object_  
  Object with key-value pairs.  
  _key_: One of the supported [good events][good] indicating the hapi event to subscribe to.  
  _value_: A single string or an array of strings to filter incoming events. `*` indicates no filtering. `null` and `undefined` are assumed to be `*`.
- __db__ - _Object_  
  MongoDB's `Db` instance. It's assumed that the connection is already opened, however it won't fail if it's not. The user is responsible for the connection's lifecycle.
- __options__ - _Object_  
  - __collection__ - _String_
    Name of the collection. Default `logs`.
  - __capped__ - _Boolean_  
    If the collection doesn't exist, creates a new capped collection. Default `false`.
  - __size__ - _Number_  
    Size in bytes of the capped collection. Default `10000000` (10MB rounded up to the nearest multiple of 256).
  - __max__ - _Number_  
    Maximum number of documents allowed in the capped collection. Default `undefined`.
  - __force__ - _Boolean_  
    If the collection already exists, it is converted into a capped collection. Default `false`.

[npm-image]: https://img.shields.io/npm/v/good-mongo.svg?style=flat
[npm-url]: https://npmjs.org/package/good-mongo
[good-reporter]: https://github.com/hapijs/good-reporter
[good]: https://github.com/hapijs/good
[hapi]: http://hapijs.com
[capped-collection]: http://docs.mongodb.org/manual/core/capped-collections