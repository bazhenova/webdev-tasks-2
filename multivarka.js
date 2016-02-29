'use strict';

const MONGO_CLIENT = require('mongodb').MongoClient;

exports.server = function (url) {
    return {
        collection: function (name) {
            var obj = {
                url: url,
                colName: name,
                query: {},
                funcName: '',
                toInsert: null,
                toUpdate: null
            };
            return getFunctions(obj);
        }
    };
};

function getFunctions(obj) {
    return {
        where: function (fieldName) {
            return getMethods(obj, fieldName, false);
        },
        find: function (callback) {
            obj.funcName = 'find';
            sendRequest(obj, callback);
        },
        remove: function (callback) {
            obj.funcName = 'remove';
            sendRequest(obj, callback);
        },
        insert: function (data, callback) {
            obj.funcName = 'insert';
            obj.toInsert = data;
            sendRequest(obj, callback);
        },
        set: function (field, data) {
            obj.toUpdate = { $set: {} };
            obj.toUpdate['$set'][field] = data;
            obj.funcName = 'update';
            return {
                update: function (callback) {
                    sendRequest(obj, callback);
                }
            };
        }
    };
}

function getMethods(obj, name, neg) {
    return {
        lessThan: function (num) {
            var condition = !neg ? { $lt: num } : { $gte: num };
            return this.setQuery(condition);
        },
        greatThan: function (num) {
            var condition = !neg ? { $gt: num } : { $lte: num };
            return this.setQuery(condition);
        },
        include: function (args) {
            var condition = !neg ? { $in: args } : { $nin: args };
            return this.setQuery(condition);
        },
        equal: function (arg) {
            var condition = !neg ? { $eq: arg } : { $ne: arg };
            return this.setQuery(condition);
        },
        not: function () {
            return getMethods(obj, name, true);
        },
        setQuery: function (condition) {
            obj.query[name] = condition;
            return getFunctions(obj);
        }
    };
}

function sendRequest(obj, callback) {
    MONGO_CLIENT.connect(obj.url, function (err, db) {
        if (err) {
            console.log(err);
        } else {
            var collection = db.collection(obj.colName);
            var func = chooseFunc(obj);
            func(collection, function (err, objects) {
                callback(err, objects);
                db.close();
            });
        }
    });
}

function chooseFunc(obj) {
    var func = null;
    switch (obj.funcName) {
        case 'find':
            func = function (coll, cb) {
                coll.find(obj.query).toArray(cb);
            };
            break;
        case 'remove':
            func = function (coll, cb) {
                coll.deleteMany(obj.query, cb);
            };
            break;
        case 'insert':
            func = function (coll, cb) {
                coll.insertOne(obj.toInsert, cb);
            };
            break;
        case 'update':
            func = function (coll, cb) {
                coll.updateMany(obj.query, obj.toUpdate, cb);
            };
            break;
        default:
            console.log('Something is wrong.');
    }
    return func;
}

