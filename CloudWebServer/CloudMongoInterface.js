var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var passwordHash = require('password-hash');

var USER_COLLECTION = "Users";
var RECIPE_COLLECTION = "Recipes";

var CloudMongoInterface = function(address, port, dbName) {
    this.connectionString = 'mongodb://' + address + ':' + port + '/' + dbName;
};

/*
 *Private method. Used to connect to the database and execute the next action.
 */
CloudMongoInterface.prototype._getDbInstance = function(next) {
    MongoClient.connect(this.connectionString, function(err, db) {
        
        if (err === null) {
            next(db);
        } else {
            throw "Mongo database is currently unavailable.";
        }
    });
};

CloudMongoInterface.prototype._getDbCollection = function(db, collectionName) {
    var collection = db.collection(collectionName);
    if (collection === null) {
        throw "collection name does not exist";
    }
    return collection;
};

CloudMongoInterface.prototype._addUser = function(user, next) {
    var self = this;
    this._getDbInstance(function(db) {
        var collection = self._getDbCollection(db, USER_COLLECTION);
        
        collection.insertOne({ username: user.username, password: passwordHash.generate(user.password), displayName: user.displayName, connectedDevice: null }, function(err, item) {
            
            if (err === null) {
                next(item.insertedCount === 1, item);
            } else {
                next(false, null);
            }
            db.close();
        });
    });
};

CloudMongoInterface.prototype._getUser = function(username, next) {
    var self = this;
    this._getDbInstance(function(db) {
        var collection = self._getDbCollection(db, USER_COLLECTION);
        
        collection.findOne({ username: username }, function(err, item) {
            
            if (err === null) {
                next(item);
            } else {
                next(null);
            }
            db.close();
        });
    });
};

CloudMongoInterface.prototype.createAccount = function(user, next) {
    var self = this;
    this._getUser(user.username, function(result) {
       if (result === null) {
            self._addUser(user, function(result, addedUser) {
                var msg = (result) ? "" : "Failed to add the user.";
                next(formatResult(result, msg), addedUser);
            });
       } else {
            next(formatResult(false, "user already exists."), null);
       }
    });
};

CloudMongoInterface.prototype.areLoginCredentialsValid = function(user, next) {
    this._getUser(user.username, function(result) {
        if (result === null || !passwordHash.verify(user.password, result.password)) {
            next(result, formatResult(false, "invalid login"));
        } else {
            next(result, formatResult(true, ""));
        }
    });
};

CloudMongoInterface.prototype.getRecipes = function(user, next) {
    var self = this;
    this._getDbInstance(function(db) {
        var collection = self._getDbCollection(db, RECIPE_COLLECTION);
        var orQueryList = [];
        orQueryList.push( { user : null } ); //presets do not have a user.
        if (user !== null) {
            orQueryList.push({ 'user.$id' : user.id }); //if they're logged in we'll also get their recipes.
        }
        collection.find( { $or: orQueryList } ).toArray(function(err, item) {
            if (err === null) {
                var recipes = [];
                for(var i = 0; i < item.length; ++i) {
                    recipes.push({
                        name: item[i].Name,
                        instructions: item[i].instructions,
                        isDefault: (item[i].user == null)
                    });
                }
                next(recipes);
            } else {
                throw "Error occurred getting recipes.";
            }
            db.close();
        });
    });
};

CloudMongoInterface.prototype._getRecipe = function(user, recipeName, next) {
    if (user === null) {
        throw "User must be provided.";
    }
    var self = this;
    this._getDbInstance(function(db) {
        var collection = self._getDbCollection(db, RECIPE_COLLECTION);
        collection.findOne({ 'user.$id' : user.id, Name : recipeName }, function(err, item) {
            if (err === null) {
                next(item);
            } else {
                throw "Error occurred getting user recipe";
            }
        });
    });
};

CloudMongoInterface.prototype._addRecipe = function(user, recipeName, instructions, next) {
    var self = this;
    this._getDbInstance(function(db) {
        var collection = self._getDbCollection(db, RECIPE_COLLECTION);
        var userRef = {
            $ref : USER_COLLECTION,
            $id : user.id
        };
        collection.insertOne({ Name: recipeName, instructions: instructions, user: userRef }, function(err, item) {
            if (err === null) {
                next(item.insertedCount === 1);
            } else {
                next(false);
            }
            db.close();
        });
    });
};

CloudMongoInterface.prototype._updateRecipe = function(user, newName, recipeName, instructions, next) {
    var self = this;
    this._getDbInstance(function(db) {
        var collection = self._getDbCollection(db, RECIPE_COLLECTION);
        var userRef = {
            $ref : USER_COLLECTION,
            $id : user.id
        };
        collection.updateOne({ Name: recipeName, user: userRef }, { "$set" : { Name: newName, instructions: instructions } }, function(err, item) {
            if (err === null) {
                next(item.result.n === 1);
            } else {
                next(false);
            }
            db.close();
        });
    });
};

CloudMongoInterface.prototype._deleteRecipe = function(user, name, next) {
    var self = this;
    this._getDbInstance(function(db) {
        var collection = self._getDbCollection(db, RECIPE_COLLECTION);
        var userRef = {
            $ref : USER_COLLECTION,
            $id : user.id
        };
        collection.remove({ Name: name, user: userRef }, { w : 1}, function(err, numRemoved) {
            debugger;
            if (err === null) {
                next(numRemoved.result.n === 1);
            } else {
                next(false);
            }
            db.close();
        });
    });
};

CloudMongoInterface.prototype.createRecipe = function(user, recipeName, instructions, next) {
    var self = this;
    this._getRecipe(user, recipeName, function(recipe) {
        if (recipe === null) {
            self._addRecipe(user, recipeName, instructions, function(result) {
                var msg = (result) ? "" : "Unable to add recipe.";
                next(formatResult(result, msg));
            });
        } else {
            next(formatResult(false, "recipe with that name already exists"));
        }
    });
};

CloudMongoInterface.prototype.editRecipe = function(user, newName, currentName, instructions, next) {
    var self = this;
    this._getRecipe(user, currentName, function(recipe){
        if (recipe != null) {
            self._updateRecipe(user, newName, currentName, instructions, function(result){
                var msg = (result) ? "" : "Unable to edit recipe.";
                next(formatResult(result, msg));   
            });
        } else {
            next(formatResult(false, "Recipe does not exist"));
        }
    });
}

CloudMongoInterface.prototype.deleteRecipe = function(user, name, next) {
    var self = this;
    this._getRecipe(user, name, function(recipe){
        if (recipe != null) {
            self._deleteRecipe(user, name, function(result) {
                var msg = (result) ? "" : "Unable to delete recipe.";
                next(formatResult(result, msg));   
            });
        } else {
            next(formatResult(false, "Recipe does not exist"));
        }
    });
}

CloudMongoInterface.prototype.userIsConnectedToDevice = function(user, deviceId, next) {
    this._getUser(user, function(result) {
        next(result != null && result.connectedDevice === deviceId);       
    });
}

CloudMongoInterface.prototype.connectUserToDevice = function(user, deviceId, next) {
    var self = this;
    debugger;
    this._getDbInstance(function(db) {
       var collection = self._getDbCollection(db, USER_COLLECTION);
       collection.updateOne({ _id : new ObjectID(user.id) }, { "$set" : { connectedDevice : deviceId }}, function(err, result) {
            debugger;
            if (err != null || result.result.n != 1) {
                next(formatResult(false, "couldn't add device id to account"));
            } else {
                next(formatResult(true, ""));
            }
       });
    });
}

function formatResult(result, msg) {
    return {
        success: result,
        message: msg
    };
};

module.exports = CloudMongoInterface;

