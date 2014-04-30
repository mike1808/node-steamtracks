var should = require('should');
var SteamTracks = require('../');


describe('streamtracks', function() {

    describe('ctor', function() {
        it('should throw if no API key is provided', function() {
            (function() { new SteamTracks() }).should.throw();
        });
    });
});