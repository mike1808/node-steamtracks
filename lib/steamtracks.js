var request = require('superagent');
var crypto = require('crypto');

/**
 * Create new instance of SteamTracks
 * @param {String} apiKey API Key
 * @param {String} apiSecret API secret
 * @param {String} [apiBase] Base URL for SteamTracks API
 * @param {String} [steamTrackBase] Base URL for SteamTracks website
 * @constructor
 */
function SteamTracks(apiKey, apiSecret, apiBase, steamTrackBase) {
    if (typeof apiKey === 'undefined') throw new Error('You should provide API key for SteamTracks');
    if (typeof apiSecret === 'undefined') throw new Error('You should provide API secret for SteamTracks');

    this.apiKey = apiKey;
    this.apiBase = apiBase || 'https://steamtracks.com/api';
    this.apiVersion = 1;
    this.apiSecret = apiSecret;

    this.steamTracksBase = steamTrackBase || 'https://steamtracks.com';

    this.request = request(this.apiBase + '/v' + this.apiVersion);

}

SteamTracks.prototype._request = function(method, resource, params, callback) {
    params[t] = new Date().getTime();

    for(var param in params) {
        if (params.hasOwnProperty(param) && typeof params[param] !== 'undefined') {
            delete params[param];
        }
    }

    var payload = params.toJSON();
    var signature = crypto.createHmac('sha1', this.apiSecret).update(payload).digest('base64');

    var request = this.request[method](resource);

    switch (method) {
        case 'get': request.query({payload: payload}); break;
        case 'post': request.send({payload: payload}); break;
        default: throw new Error('Wrong method');
    }

    request
        .set('SteamTracks-Key', this.apiKey)
        .set('SteamTracks-Signature', signature)
        .set('Accept', 'application/json')
        .end(function(res) {
            if (res.status !== 200) {
                callback(res.body.error);
            } else {
                res.body.result ? callback(null, res.body.result) : callback(null, res.body);
            }
        });


    return request;
};

/**
 * Signup API
 */

/**
 * Will generate a App Signup Token to send users to SteamTracks. With that token users will be able to signup to your app by redirecting them to https://steamtracks
 * .com/appauth/:token. The Token will be valid for 30 minutes
 * @param {int} [steamId] If provided, will only accept the user with that SteamID32
 * @param {Function} callback
 */
SteamTracks.prototype.getSignupToken = function(steamId, callback) {
    this._request('get', '/signup/token', { steamid32: steamId}, function(err, res) {
        if (err) return callback(err);
        callback(res.token);
    });
};

/**
 * Returns for signing up
 * @param {String} token
 * @param {int} steamId
 * @param {Function} callback
 */
SteamTracks.prototype.getSignupURL = function(token, steamId, callback) {
    if (token) {
        callback(null, this.steamTracksBase + '/appauth/' + token);
    } else {
      this.getSignupToken(steamId, function(err, token) {
          if (err) return callback(err);
          callback(null, this.steamTracksBase + '/appauth/' + token);
      });
    }
};

/**
 * Will give back the status of the signup process to a corresponding token.
 * @param {String} token App Signup Token
 * @param {Function} callback
 */
SteamTracks.prototype.getSignupStatus = function(token, callback) {
    this._request('get', '/signup/status', { token: token }, callback);
};

/**
 * Acknowledges the signup and finishes signup process
 * @param {String} token App Signup Token
 * @param {int} [user] SteamID32
 * @param {Function} callback
 */
SteamTracks.prototype.ackSignup = function(token, user, callback) {
    this._request('get', '/signup/ack', { token: token, user: user}, callback);
};

/**
 * Notify API
 */

/**
 * This sends a notification to users of your app (up to 100) or to all of them (broadcast). The broadcast has a
 * cooldown of 60 minutes, notifying a single user has a 10 minute cooldown.
 * If the broadcast is on cooldown, it will result in an error. If it is a message to (a) single user(s) it will
 * silently fail on those that have the notify on cooldown.
 * @param {String} message Message to be sent, minimum length 10 chars, maximum length 500 chars
 * @param {int} [to] Recipient SteamID32 or array of recipients SteamID32, e.g. 12345678 or [12345678, 23456789, ...].
 * Has a limit of 100 recipients. Only optional if broadcast is set to true
 * @param {bool} [broadcast] Set to true if it is a broadcast notification, default false. Broadcast has 60 minutes
 * cooldown
 * @param {bool} [excludeOffline] Exclude offline users (personaState 0) from that message. Default false
 * @param {Function} callback
 */
SteamTracks.prototype.notify = function(message, to, broadcast, excludeOffline, callback) {
    this._request('post', '/notify',
        { message: message, to: to, broadcast: broadcast, exclude_offline: excludeOffline}, callback);
};


/**
 * Users API
 */

/**
 * Shows all information about the given user the app has access to. Maximum 100 results per page. Sorted by date
 * joined_app_at ascending (first joined users on page 1, last joined users on last page)
 * @param {int} [page] Page number, starting at 1 (max 100 results per page)
 * @param {Function} callback
 */
SteamTracks.prototype.usersList = function(page, callback) {
    this._request('get', '/users', { page: page }, callback);
};

/**
 * Displays the online status (sum of users in that state) of the users for the app.
 * @param {Function} callback
 */
SteamTracks.prototype.usersStates = function(callback) {
    this._request('get', '/users/states', {}, callback);
};

/**
 * Returns the number of users in your app
 * @param {Function} callback
 */
SteamTracks.prototype.usersCount = function(callback) {
    this._request('get', '/users/count', {}, callback);
};

/**
 * Shows all information about the given user the app has access to
 * @param {int} user SteamID32
 * @param {Function} callback
 */
SteamTracks.prototype.userInfo = function(user, callback) {
    this._request('get', '/users/info', { user: user }, callback);
};

/**
 * Shows how many users are playing what game. Returns the name of the game (“n” for “name”), the sum of users who are
 * running the game (having the client open, “o” for “online”) and the part of those who are playing an active game
 * (“p” for “playing”).
 * Full list of Steam Game AppIDs: api.steampowered.com/ISteamApps/GetAppList/v0001
 * @param {Function} callback
 */
SteamTracks.prototype.usersGames = function(callback) {
    this._request('get', '/users/games', {}, callback);
};

/**
 * Returns a list of all users that left the app (revoked permissions to read their information).
 * @param callback
 */
SteamTracks.prototype.usersLeavers = function(callback) {
    this._request('get', '/users/leavers', {}, callback);
};

/**
 * Clears the list of users that have left the app and returns the removed list
 * Returns a list of all users that left the app (revoked permissions to read their information) and deletes them from
 * the server list.
 * This is the recommended command to keep track of users that have left your application.
 * @param {Function} callback
 */
SteamTracks.prototype.usersFlushLeavers = function(callback) {
    this._request('get', '/users/flushleavers', {}, callback);
};

/**
 * Results all changes since a certain timestamp. This is the recommended and most comfortable function to keep your
 * data updated. Fields can be passed as parameter so it will only return those fields (e.g. you only want to track
 * Dota 2 Wins and MMR).
 *
 * Only the changed fields will be returned!
 *
 * Will return the next_timestamp information, save this information and use it for the next request to receive the
 * updates since the new timestamp.
 *
 * NOTICE: Please chose appropriate intervals for this query. We recommend a background-worker to pick up this request
 * every 10 to 60 minutes depending on your usecase and fields you are reading.
 * @param {int} from Timestamp in milliseconds (use returned next_timestamp from last request)
 * @param {Array} fields Array with field names, e.g. ['personaState', 'playerName', 'dota2:wins']
 * @param {Function} callback
 */
SteamTracks.prototype.usersChanges = function(from, fields, callback) {
    this._request('get', 'users/changes', { from_timestamp: from, fields: fields }, callback);
};

module.exports = SteamTracks;