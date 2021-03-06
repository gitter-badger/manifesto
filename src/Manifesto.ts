var http = require("http");
var url = require("url");

import M = Manifesto;

module.exports = <M.IManifesto>{

    manifest: null,
    canvasIndex: 0,
    sequenceIndex: 0,

    load: function (manifestUri: string, callback: (manifest: any) => void): void {

        var u = url.parse(manifestUri);

        var fetch = http.request({
            host: u.hostname,
            port: u.port || 80,
            path: u.pathname,
            method: "GET",
            withCredentials: false
        }, (res) => {
            var result = "";
            res.on('data', (chunk) => {
                result += chunk;
            });
            res.on('end', () => {
                callback(result);
            });
        });

        fetch.end();
    },

    parse: function(manifest: any, callback: (manifest: M.Manifest) => void): void {
        this.manifest = JSON.parse(manifest);

        if (this.manifest.structures && this.manifest.structures.length){
            this.parseRanges(this.getRootRange(), '');
        }

        callback(this.manifest);
    },

    // gives each canvas a collection of ranges it belongs to.
    // also builds a 'path' string property for each range
    parseRanges: function(range: M.Range, path: string): void {
        range.path = path;

        if (range.canvases){
            // loop through canvases and associate with matching @id
            for (var j = 0; j < range.canvases.length; j++){

                var canvas = range.canvases[j];

                if (typeof(canvas) === "string"){
                    canvas = this.getCanvasById(<string>canvas);
                }

                if (!canvas){
                    // canvas not found - json invalid.
                    range.canvases[j] = null;
                    continue;
                }

                if (!canvas.ranges) canvas.ranges = [];

                canvas.ranges.push(range);
                // create two-way relationship
                range.canvases[j] = canvas;
            }
        }

        if (range.ranges) {
            range.ranges = [];

            for (var k = 0; k < range.ranges.length; k++) {
                var r = range.ranges[k];

                // if it's a url ref
                if (typeof(r) === "string"){
                    r = this.getRangeById(r);
                }

                // if this range already has a parent, continue.
                if (r.parentRange) continue;

                r.parentRange = range;

                range.ranges.push(r);

                this.parseRanges(r, path + '/' + k);
            }
        }
    },

    getCurrentCanvas: function(): M.Canvas {
        return this.getCurrentSequence().canvases[this.canvasIndex];
    },

    getCurrentSequence: function(): M.Sequence {
        return this.manifest.sequences[this.sequenceIndex];
    },

    getRootRange: function(): M.Range {

        // loop through ranges looking for viewingHint="top"
        if (this.manifest.structures){
            for (var i = 0; i < this.manifest.structures.length; i++){
                var r: M.Range = this.manifest.structures[i];
                if (r.viewingHint === M.ViewingHint.top){
                    this.manifest.rootRange = r;
                    break;
                }
            }
        }

        if (!this.manifest.rootRange){
            this.manifest.rootRange = new M.Range();
            this.manifest.rootRange.path = "";
            this.manifest.rootRange.ranges = this.manifest.structures;
        }

        return this.manifest.rootRange;
    },

    getCanvasById: function(id: string): M.Canvas{
        var sequence: M.Sequence = this.getCurrentSequence();
        for (var i = 0; i < sequence.canvases.length; i++) {
            var c = sequence.canvases[i];

            if (c['@id'] === id){
                return c;
            }
        }

        return null;
    },

    getRangeById: function(id: string): M.Range {
        for (var i = 0; i < this.manifest.structures.length; i++) {
            var r = this.manifest.structures[i];

            if (r['@id'] === id){
                return r;
            }
        }

        return null;
    }
};