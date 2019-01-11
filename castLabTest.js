var blob = null;
var xhr = new XMLHttpRequest();
xhr.open("GET", "https://demo.castlabs.com/tmp/text0.mp4");
xhr.responseType = "blob";
xhr.onload = function () {
    console.log("Successfully loaded file https://demo.castlabs.com/tmp/text0.mp4");
    blob = xhr.response;
    var myReader = new FileReader();
    myReader.addEventListener("loadend", function (e) {
        var arrayBuffer = e.target.result;
        // var parsedFile = ISOBoxer.parseBuffer(arrayBuffer);
        File(arrayBuffer).parse();
    });
    myReader.readAsArrayBuffer(blob);
}
xhr.send();

var Utils = {};
Utils.Cursor = function(initialOffset) {
    this.offset = typeof initialOffset == 'undefined' ? 0 : initialOffset ;
}

var File = function(arrayBuffer) {
    this.cursor = new Utils.Cursor();
    if (arrayBuffer) {
        this.rawValues = new DataView(arrayBuffer);
    }
}

File.prototype.parse = function(){
    this.cursor.offset = 0;
    while(this.cursor.offset < this.rawValues.byteLength){
        var box = Box.parse(this);
    }
}

var Box = function(){
    this.cursor = new Utils.Cursor();
}

Box.parse = function(parent){
    var tempBox 
} 