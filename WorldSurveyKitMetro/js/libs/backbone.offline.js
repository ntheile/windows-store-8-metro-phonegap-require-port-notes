﻿// https://github.com/ak/backbone.offline/blob/sync/src/backbone_offline.coffee

(function (global, _, Backbone) {
    global.Offline = {
        VERSION: '0.4.1.alfa',
        localSync: function (method, model, options, store) {
            var resp, _ref;
            resp = (function () {
                switch (method) {
                    case 'read':
                        if (_.isUndefined(model.id)) {
                            return store.findAll(options);
                        } else {
                            return store.find(model, options);
                        }
                        break;
                    case 'create':
                        return store.create(model, options);
                    case 'update':
                        return store.update(model, options);
                    case 'delete':
                        return store.destroy(model, options);
                }
            })();
            if (resp) {
                return options.success((_ref = resp.attributes) != null ? _ref : resp);
            } else {
                return typeof options.error === "function" ? options.error('Record not found') : void 0;
            }
        },
        sync: function (method, model, options) {
            var store, _ref;
            store = model.storage || ((_ref = model.collection) != null ? _ref.storage : void 0);
            if (store && (store != null ? store.support : void 0)) {
                return Offline.localSync(method, model, options, store);
            } else {
                return Backbone.ajaxSync(method, model, options);
            }
        },
        onLine: function () {
            return navigator.onLine !== false;
        }
    };
    Backbone.ajaxSync = Backbone.sync;
    Backbone.sync = Offline.sync;
    Offline.Storage = (function () {

        function Storage(name, collection, options) {
            this.name = name;
            this.collection = collection;
            if (options == null) {
                options = {};
            }
            this.support = this.isLocalStorageSupport();
            this.allIds = new Offline.Index(this.name, this);
            this.destroyIds = new Offline.Index("" + this.name + "-destroy", this);
            this.sync = new Offline.Sync(this.collection, this);
            this.keys = options.keys || {};
            this.autoPush = options.autoPush || false;

            // <cascade setup>
            this.cascadeDelete = options.cascadeDelete || false; 
            if ( this.cascadeDelete == true ) { 

                ////console.log("cascade 1 - setup");

                var parentCollection;
                var cascadeKey;
                var cascadeCollection = this.collection;
                var serverCascades = options.serverCascades || true;

                // loop keys to snag parentCollection and cascadeKey
                var _ref = this.keys;
                for (var field in _ref) {
                    parentCollection = _ref[field];
                    cascadeKey = field;
                }

                ////console.log("parentCollection");
                //////console.log(parentCollection);
                ////console.log("cascadeKey");
                ////console.log(cascadeKey);
                ////console.log("cascadeCollection");
                ////console.log(cascadeCollection);

                this.cascadeListener(parentCollection, cascadeCollection, cascadeKey, serverCascades);

            }
            // </ cascade setup >
        }

        Storage.prototype.isLocalStorageSupport = function () {
            try {
                localStorage.setItem('isLocalStorageSupport', '1');
                localStorage.removeItem('isLocalStorageSupport');
                return true;
            } catch (e) {
                return false;
            }
        };

        Storage.prototype.setItem = function (key, value) {
            try {
                return localStorage.setItem(key, value);
            } catch (e) {
                if (e.name === 'QUOTA_EXCEEDED_ERR') {
                    return this.collection.trigger('quota_exceed');
                } else {
                    return this.support = false;
                }
            }
        };

        Storage.prototype.removeItem = function (key) {
            return localStorage.removeItem(key);
        };

        Storage.prototype.getItem = function (key) {
            return localStorage.getItem(key);
        };

        Storage.prototype.create = function (model, options) {
            if (options == null) {
                options = {};
            }
            options.regenerateId = true;
            return this.save(model, options);
        };

        Storage.prototype.update = function (model, options) {
            if (options == null) {
                options = {};
            }
            return this.save(model, options);
        };

        Storage.prototype.destroy = function (model, options) {
            var sid;
            if (options == null) {
                options = {};
            }
            if (!(options.local || (sid = model.get('sid')) === 'new')) {
                this.destroyIds.add(sid);
            }
            return this.remove(model, options);
        };

        Storage.prototype.find = function (model, options) {
            if (options == null) {
                options = {};
            }
            return JSON.parse(this.getItem("" + this.name + "-" + model.id));
        };

        Storage.prototype.findAll = function (options) {
            var id, _i, _len, _ref, _results;
            if (options == null) {
                options = {};
            }
            if (!options.local) {
                if (this.isEmpty()) {
                    this.sync.full(options);
                } else {
                    this.sync.incremental(options);
                }
            }
            _ref = this.allIds.values;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                id = _ref[_i];
                _results.push(JSON.parse(this.getItem("" + this.name + "-" + id)));
            }
            return _results;
        };

        Storage.prototype.s4 = function () {
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        };

        Storage.prototype.incrementId = 0x1000000;

        Storage.prototype.localId1 = ((1 + Math.random()) * 0x100000 | 0).toString(16).substring(1);

        Storage.prototype.localId2 = ((1 + Math.random()) * 0x100000 | 0).toString(16).substring(1);

        Storage.prototype.mid = function () {
            return ((new Date).getTime() / 1000 | 0).toString(16) + this.localId1 + this.localId2 + (++this.incrementId).toString(16).substring(1);
        };

        Storage.prototype.guid = function () {
            return this.s4() + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' + this.s4() + '-' + this.s4() + this.s4() + this.s4();
        };

        Storage.prototype.save = function (item, options) {
            var id, _ref, _ref1;
            if (options == null) {
                options = {};
            }
            if (options.regenerateId) {
                id = options.id === 'mid' ? this.mid() : this.guid();
                item.set({
                    sid: ((_ref = item.attributes) != null ? _ref.sid : void 0) || ((_ref1 = item.attributes) != null ? _ref1.id : void 0) || 'new',
                    id: id
                });
            }
            if (!options.local) {
                item.set({
                    updated_at: (new Date()).toJSON(),
                    dirty: true
                });
            }
            this.replaceKeyFields(item, 'local');
            this.setItem("" + this.name + "-" + item.id, JSON.stringify(item));
            this.allIds.add(item.id);
            if (this.autoPush && !options.local) {
                this.sync.pushItem(item);
            }
            return item;
        };

        Storage.prototype.remove = function (item, options) {
            var sid;
            if (options == null) {
                options = {};
            }
            this.removeItem("" + this.name + "-" + item.id);
            this.allIds.remove(item.id);
            sid = item.get('sid');
            if (this.autoPush && sid !== 'new' && !options.local) {
                this.sync.flushItem(sid);
            }
            return item;
        };

        Storage.prototype.isEmpty = function () {
            return this.getItem(this.name) === null;
        };

        Storage.prototype.clear = function () {
            var collectionKeys, key, keys, record, _i, _j, _len, _len1, _ref, _results,
              _this = this;
            keys = Object.keys(localStorage);
            collectionKeys = _.filter(keys, function (key) {
                return (new RegExp(_this.name)).test(key);
            });
            for (_i = 0, _len = collectionKeys.length; _i < _len; _i++) {
                key = collectionKeys[_i];
                this.removeItem(key);
            }
            _ref = [this.allIds, this.destroyIds];
            _results = [];
            for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
                record = _ref[_j];
                _results.push(record.reset());
            }
            return _results;
        };

        Storage.prototype.replaceKeyFields = function (item, method) {

            var collection, field, newValue, replacedField, wrapper, _ref, _ref1, _ref2;
            if (Offline.onLine()) {
                if (item.attributes) {
                    item = item.attributes;
                }
                _ref = this.keys;
                for (field in _ref) {
                    collection = _ref[field];
                    replacedField = item[field];
                    if (!/^\w{8}-\w{4}-\w{4}/.test(replacedField) || method !== 'local') {
                        newValue = method === 'local' ? (wrapper = new Offline.Collection(collection), (_ref1 = wrapper.get(replacedField)) != null ? _ref1.id : void 0) : (_ref2 = collection.get(replacedField)) != null ? _ref2.get('sid') : void 0;
                        if (!_.isUndefined(newValue)) {
                            item[field] = newValue;
                        }
                    }
                }
            }
            return item;

        };

        ///
        /// Added for cascade deletes.
        /// Options on Storage look like this { cascadeDelete: { cascadeCollection: App.uResponseCollection, cascadeKey: newFileInstanceId } }
        /// Pass in the parentModel that is being deleted.
        /// If the model has cascadeDelete options passed it will cascade 
        ///    deletions down to all dependent child models in the cascadeCollection
        ///    based on the cascadeKey (this is usually the pk of the parentModel and the fk on the cascadeCollection model)
        ///    
            Storage.prototype.cascadeListener = function (parentCollection, cascadeCollection, cascadeKey, serverCascades) {
                // bind to this collections remove event so we can cascade deletes down to children
                ////console.log("cascade 2 - bind");
                var self = this;
                
                parentCollection.on("remove", function (parentModel) {
                    ////console.log("removing and shaking , parent model");
                    ////console.log(parentModel);
                    self.cascadeOnDelete(parentModel, cascadeCollection, cascadeKey, serverCascades);
                }, self);

            };

            Storage.prototype.cascadeOnDelete = function (parentModel, cascadeCollection, cascadeKey, serverCascades) {
                ////console.log("cascade 3 - event ");
                ////console.log("Made it to cascadeOnDeleteFunction, this is where i  will delete all the children ;)");

                // when a model from parentCollection is deleted the cascadeOnDelete function is 
                // fired which loops all models in cascadeCollection where cascadeKey equals parentModelId
                // if serverCascades equals false or the parentModel is dirty then the child Models will be deleted
                // The case where the cascade will not occur is if serverCascades = true and the parent model is not dirty, 
                // meaning your sql server will take care of cascading the delteions for you. 
                
                var parentModelId = parentModel.get("id");
                var dirty = parentModel.get("dirty");

                whereClause = $.parseJSON('{"' + cascadeKey + '":"' + parentModelId + '"}');
                
                if (dirty == true || serverCascades == false) {
                    ////console.log("whereClause");
                   // //console.log(whereClause);

                    _.each(cascadeCollection.where(whereClause), function (childModel) {
                        ////console.log("deleting child model");
                        ////console.log(childModel);
                        childModel.destroy();
                    });
                }
                else{
                    ////console.log("the server will take of the cascade for you :)");
                }

            };
        /// </ end >

        return Storage;

    })();
    Offline.Sync = (function () {

        function Sync(collection, storage) {
            this.collection = new Offline.Collection(collection);
            this.storage = storage;
        }

        Sync.prototype.ajax = function (method, model, options) {
            if (Offline.onLine()) {
                this.prepareOptions(options);
                return Backbone.ajaxSync(method, model, options);
            } else {
                return this.storage.setItem('offline', 'true');
            }
        };

        Sync.prototype.full = function (options) {
            var _this = this;
            if (options == null) {
                options = {};
            }
            return this.ajax('read', this.collection.items, _.extend({}, options, {
                success: function (response, status, xhr) {
                    var item, _i, _len;
                    _this.storage.clear();
                    _this.collection.items.reset([], {
                        silent: true
                    });
                    for (_i = 0, _len = response.length; _i < _len; _i++) {
                        item = response[_i];
                        _this.collection.items.create(item, {
                            silent: true,
                            local: true,
                            regenerateId: true
                        });
                    }
                    if (!options.silent) {
                        _this.collection.items.trigger('reset');
                    }
                    if (options.success) {
                        return options.success(response);
                    }
                }
            }));
        };

        Sync.prototype.incremental = function (options) {
            var _this = this;
            if (options == null) {
                options = {};
            }
            return this.pull(_.extend({}, options, {
                success: function () {
                    return _this.push();
                }
            }));
        };

        Sync.prototype.prepareOptions = function (options) {
            var success,
              _this = this;
            if (this.storage.getItem('offline')) {
                this.storage.removeItem('offline');
                success = options.success;
                return options.success = function (response, status, xhr) {
                    success(response, status, xhr);
                    return _this.incremental();
                };
            }
        };

        Sync.prototype.pull = function (options) {
            var _this = this;
            if (options == null) {
                options = {};
            }
            return this.ajax('read', this.collection.items, _.extend({}, options, {
                success: function (response, status, xhr) {
                    var item, _i, _len;
                    _this.collection.destroyDiff(response);
                    for (_i = 0, _len = response.length; _i < _len; _i++) {
                        item = response[_i];
                        _this.pullItem(item);
                    }
                    if (options.success) {
                        return options.success();
                    }
                }
            }));
        };

        Sync.prototype.pullItem = function (item) {
            var local;
            local = this.collection.get(item.id);
            if (local) {
                return this.updateItem(item, local);
            } else {
                return this.createItem(item);
            }
        };

        Sync.prototype.createItem = function (item) {
            if (!_.include(this.storage.destroyIds.values, item.id.toString())) {
                item.sid = item.id;
                delete item.id;
                return this.collection.items.create(item, {
                    local: true
                });
            }
        };

        Sync.prototype.updateItem = function (item, model) {
            if ((new Date(model.get('updated_at'))) < (new Date(item.updated_at))) {
                delete item.id;
                return model.save(item, {
                    local: true
                });
            }
        };

        Sync.prototype.push = function () {
            var item, sid, _i, _j, _len, _len1, _ref, _ref1, _results;
            _ref = this.collection.dirty();
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                item = _ref[_i];
                this.pushItem(item);
            }
            _ref1 = this.storage.destroyIds.values;
            _results = [];
            for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                sid = _ref1[_j];
                _results.push(this.flushItem(sid));
            }
            return _results;
        };

        Sync.prototype.pushFull = function (callback) {
            var item, _i, _j, _len, _len1, _ref, _ref1, _results, _results1;
            if (Offline.onLine()) {
                _ref = this.collection.dirty();
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    item = _ref[_i];
                    _results.push(this.pushItemFull(item, callback));
                }
                return _results;
            } else {
                _ref1 = this.collection.dirty();
                _results1 = [];
                for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    item = _ref1[_j];
                    _results1.push(callback({
                        failure: item.sid || 0
                    }));
                }
                return _results1;
            }
        };

        Sync.prototype.pushItemFull = function (item, callback) {
            var localId, method, _ref,
              _this = this;
            this.storage.replaceKeyFields(item, 'server');
            localId = item.id;
            delete item.attributes.id;
            _ref = item.get('sid') === 'new' ? ['create', null] : ['update', item.attributes.sid], method = _ref[0], item.id = _ref[1];
            this.ajax(method, item, {
                success: (function (response, status, xhr) {
                    if (method === 'create') {
                        item.set({
                            sid: response.id
                        });
                    }
                    item.save({
                        dirty: false
                    }, {
                        local: true
                    });
                    if (callback) {
                        return callback({
                            success: item.sid
                        });
                    }
                }),
                error: (function (model, response, opts) {
                    if (callback) {
                        return callback({
                            failure: item.sid || 0
                        });
                    }
                })
            });
            item.attributes.id = localId; 
            return item.id = localId;  
        };

        Sync.prototype.pushItem = function (item) {
            var localId, method, _ref,
              _this = this;
            this.storage.replaceKeyFields(item, 'server');
            localId = item.id;
            delete item.attributes.id;
            _ref = item.get('sid') === 'new' ? ['create', null] : ['update', item.attributes.sid], method = _ref[0], item.id = _ref[1];
            this.ajax(method, item, {
                success: function (response, status, xhr) {
                    if (method === 'create') {
                        item.set({
                            sid: response.id
                        });
                    }
                    return item.save({
                        dirty: false
                    }, {
                        local: true
                    });
                }
            });
            item.attributes.id = localId;
            return item.id = localId;
        };

        Sync.prototype.flushItem = function (sid) {
            var model,
              _this = this;
            model = this.collection.fakeModel(sid);
            return this.ajax('delete', model, {
                success: function (response, status, xhr) {
                    return _this.storage.destroyIds.remove(sid);
                }
            });
        };

        return Sync;

    })();
    Offline.Index = (function () {

        function Index(name, storage) {
            var store;
            this.name = name;
            this.storage = storage;
            store = this.storage.getItem(this.name);
            this.values = (store && store.split(',')) || [];
        }

        Index.prototype.add = function (itemId) {
            if (!_.include(this.values, itemId.toString())) {
                this.values.push(itemId.toString());
            }
            return this.save();
        };

        Index.prototype.remove = function (itemId) {
            this.values = _.without(this.values, itemId.toString());
            return this.save();
        };

        Index.prototype.save = function () {
            return this.storage.setItem(this.name, this.values.join(','));
        };

        Index.prototype.reset = function () {
            this.values = [];
            return this.storage.removeItem(this.name);
        };

        return Index;

    })();
    return Offline.Collection = (function () {

        function Collection(items) {
            this.items = items;
        }

        Collection.prototype.dirty = function () {
            return this.items.where({
                dirty: true
            });
        };

        Collection.prototype.get = function (sid) {
            return this.items.find(function (item) {
                return item.get('sid') === sid;
            });
        };

        Collection.prototype.destroyDiff = function (response) {
            var diff, sid, _i, _len, _ref, _results;
            diff = _.difference(_.without(this.items.pluck('sid'), 'new'), _.pluck(response, 'id'));
            _results = [];
            for (_i = 0, _len = diff.length; _i < _len; _i++) {
                sid = diff[_i];
                _results.push((_ref = this.get(sid)) != null ? _ref.destroy({
                    local: true
                }) : void 0);
            }
            return _results;
        };

        Collection.prototype.fakeModel = function (sid) {
            var model;
            model = new Backbone.Model({
                id: sid
            });
            model.urlRoot = this.items.url;
            return model;
        };

        return Collection;

    })();
})(window, _, Backbone);
